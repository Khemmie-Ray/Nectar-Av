// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {NectarMath} from "./libraries/NectarMath.sol";
import {INectarPool} from "./interfaces/INectarPool.sol";
import {INectarVault} from "./interfaces/INectarVault.sol";
import {INectarFactory} from "./interfaces/INectarFactory.sol";
import {IVRFModule} from "./interfaces/IVRFModule.sol";

/// @title NectarPool
/// @notice Blueprint for EIP-1167 clones. One instance per savings pool.
///         Handles enrollment, deposits, missed-payment eviction, and claims.
///         All external DeFi integration lives in NectarVault.sol.
contract NectarPool is INectarPool, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using NectarMath for *;

    // ─── State ────────────────────────────────────────────────────────────────

    PoolConfig public config;
    PoolState public override state;

    address public factory;
    address public vault;
    address public vrfModule;
    address public creator;

    uint256 public poolStartTime; // Timestamp of pool creation / cycle 1 start
    uint256 public savingEndTime; // Timestamp when SAVING phase ends
    uint256 public yieldEndTime; // Timestamp when YIELDING phase ends

    uint16 public activeMembers;
    uint16 public currentWinnersCount;

    address[] public memberList;
    mapping(address => MemberState) public members;
    mapping(address => bool) private isMember;

    // Tracks claim amounts set during DRAWING phase
    mapping(address => uint256) public claimable;
    uint256 public pendingRandomWord;
    bool public hasPendingRandomWord;

    // Prevents duplicate initialization on clones
    bool private initialized;

    // Min yield required before we bother requesting randomness.
    // The protocol is USDC-only, so this threshold is encoded in 6-decimal USDC units.
    uint256 public constant MINIMUM_YIELD_THRESHOLD = 1e4; // 0.01 USDC

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyState(PoolState required) {
        _onlyState(required);
        _;
    }

    modifier onlyVrfModule() {
        _onlyVrfModule();
        _;
    }

    function _onlyState(PoolState required) internal view {
        require(state == required, "NectarPool: wrong phase");
    }

    function _onlyVrfModule() internal view {
        require(msg.sender == vrfModule, "NectarPool: caller not VRF module");
    }

    // ─── Initialization ────────────────────────────────────────────────────────

    /// @notice Called once by the Factory immediately after clone deployment.
    function initialize(PoolConfig calldata _config, address _creator, address _vault, address _vrfModule)
        external
        override
    {
        require(!initialized, "NectarPool: already initialized");
        initialized = true;

        factory = msg.sender;
        config = _config;
        creator = _creator;
        vault = _vault;
        vrfModule = _vrfModule;

        currentWinnersCount = _config.winnersCount;
        poolStartTime = block.timestamp;
        state = PoolState.ENROLLMENT;

        // Saving phase length = totalCycles × cycleDuration
        savingEndTime = block.timestamp + (uint256(_config.totalCycles) * _config.cycleDuration);

        // Yield period: 1 wk (daily), 2 wk (weekly), 4 wk (monthly)
        // Daily cycleDuration = 86400, Weekly = 604800, Monthly ≈ 2592000
        uint256 yieldDuration;
        if (_config.cycleDuration == 86400) yieldDuration = 7 days;
        else if (_config.cycleDuration == 604800) yieldDuration = 14 days;
        else yieldDuration = 28 days;

        yieldEndTime = savingEndTime + yieldDuration;

        emit PhaseTransitioned(PoolState.ENROLLMENT, PoolState.ENROLLMENT);
    }

    // ─── Join Pool ────────────────────────────────────────────────────────────

    /// @notice Any eligible wallet can join and makes their first deposit immediately.
    function joinPool(uint256 maxRate) external override nonReentrant onlyState(PoolState.ENROLLMENT) {
        require(!isMember[msg.sender], "NectarPool: already a member");
        require(activeMembers < config.maxMembers, "NectarPool: pool is full");
        _incrementActivePool(msg.sender);

        uint16 cycle = currentCycle();

        // ── Enrollment window guards ────────────────────────────────────────
        require(
            NectarMath.isWithinEnrollmentWindow(cycle, config.totalCycles, uint8(config.enrollmentWindow)),
            "NectarPool: enrollment window closed"
        );

        uint16 remaining = NectarMath.remainingCycles(cycle, config.totalCycles);

        require(NectarMath.isAboveThreeCycleFloor(remaining), "NectarPool: fewer than 3 cycles remain");

        uint256 perMember = NectarMath.perMemberTotal(config.targetAmount, config.maxMembers);
        uint256 baseRate = NectarMath.baseContribution(perMember, config.totalCycles);
        uint256 joinRate = NectarMath.lateJoinerRate(perMember, remaining);

        require(NectarMath.isWithinTwoXCap(joinRate, baseRate), "NectarPool: rate exceeds 2x cap");
        require(maxRate == 0 || joinRate <= maxRate, "NectarPool: rate exceeds maxRate");

        // ── Register member ─────────────────────────────────────────────────
        isMember[msg.sender] = true;
        memberList.push(msg.sender);
        activeMembers++;

        members[msg.sender] = MemberState({
            joinCycle: cycle,
            cyclesPaid: 0,
            assignedRate: joinRate,
            totalPaid: 0,
            isRemoved: false,
            hasClaimed: false,
            lastPaidCycle: 0
        });

        emit MemberJoined(msg.sender, cycle, joinRate);

        // ── Take the first deposit immediately ──────────────────────────────
        _takeDeposit(msg.sender, cycle, joinRate);
    }

    // ─── Deposit ──────────────────────────────────────────────────────────────

    /// @notice Deposit exactly the assigned amount for the current cycle.
    function deposit(uint256 amount) external override nonReentrant {
        require(state == PoolState.ENROLLMENT || state == PoolState.SAVING, "NectarPool: deposits not accepted");
        require(isMember[msg.sender], "NectarPool: not a member");

        _lazyEvict(msg.sender);

        MemberState storage m = members[msg.sender];
        require(!m.isRemoved, "NectarPool: member removed");

        uint16 cycle = currentCycle();

        // Must be within active contribution window
        require(_isWithinContributionWindow(cycle), "NectarPool: outside contribution window");
        require(cycle > m.lastPaidCycle, "NectarPool: already paid this cycle");

        // Grace-period: accept current cycle payment only (not a skip of 2+)
        uint256 expectedAmount = _expectedDepositAmount(m, cycle);
        require(amount == expectedAmount, "NectarPool: wrong deposit amount");

        _takeDeposit(msg.sender, cycle, amount);
    }

    /// @notice Batch deposit to catch up a missed cycle + current cycle in ONE tx.
    ///         Accepts exactly assignedRate × 2. The contract internally splits them.
    function batchDeposit(uint256 totalAmount) external override nonReentrant {
        require(state == PoolState.ENROLLMENT || state == PoolState.SAVING, "NectarPool: deposits not accepted");
        require(isMember[msg.sender], "NectarPool: not a member");

        _lazyEvict(msg.sender);

        MemberState storage m = members[msg.sender];
        require(!m.isRemoved, "NectarPool: member removed");

        uint16 cycle = currentCycle();
        uint16 missedCycle = cycle - 1;

        // Make sure this is a valid grace catch-up (missed exactly one cycle)
        require(
            missedCycle > m.lastPaidCycle && (missedCycle - m.lastPaidCycle) == 1,
            "NectarPool: not eligible for batch deposit"
        );
        require(totalAmount == m.assignedRate * 2, "NectarPool: batch must be exactly 2x rate");

        // Record missed cycle payment first, then current
        _takeDeposit(msg.sender, missedCycle, m.assignedRate);
        _takeDeposit(msg.sender, cycle, m.assignedRate);
    }

    // ─── Emergency Withdrawal ────────────────────────────────────────────────

    function emergencyWithdraw() external override nonReentrant {
        require(isMember[msg.sender], "NectarPool: not a member");
        MemberState storage m = members[msg.sender];
        require(!m.isRemoved, "NectarPool: already removed");
        require(state == PoolState.ENROLLMENT || state == PoolState.SAVING, "NectarPool: not available in this phase");

        uint256 refund = m.totalPaid;
        m.isRemoved = true;
        m.hasClaimed = true;
        activeMembers--;
        _decrementActivePool(msg.sender);

        _adjustWinnersIfNeeded();

        IERC20(config.token).safeTransfer(msg.sender, refund);

        emit MemberRemoved(msg.sender, refund);
    }

    // ─── Phase Transitions (called by Keeper or public incentive) ─────────────

    /// @notice End SAVING phase and send funds to NectarVault.
    ///         Checks 50% minimum fill threshold before proceeding.
    function endSavingsPhase() external override nonReentrant {
        // Lazy transition: pool may still be in ENROLLMENT if no one triggered deposit after window
        _transitionToSavingIfNeeded();
        require(state == PoolState.SAVING, "NectarPool: wrong phase");
        require(block.timestamp >= savingEndTime, "NectarPool: saving period not over");

        // Check minimum fill threshold
        if (!NectarMath.meetsMinFillThreshold(activeMembers, config.maxMembers)) {
            _cancelPool("Minimum fill threshold not met");
            return;
        }

        uint256 totalBalance = IERC20(config.token).balanceOf(address(this));
        IERC20(config.token).approve(vault, totalBalance);
        INectarVault(vault).depositAndSupply(address(this), config.token, totalBalance);

        state = PoolState.YIELDING;
        emit PhaseTransitioned(PoolState.SAVING, PoolState.YIELDING);
    }

    /// @notice Called by Keeper at end of yield period. Graceful if Aave is locked.
    function endYieldPhase() external override nonReentrant onlyState(PoolState.YIELDING) {
        require(block.timestamp >= yieldEndTime, "NectarPool: yield period not over");

        state = PoolState.DRAWING;
        emit PhaseTransitioned(PoolState.YIELDING, PoolState.DRAWING);

        IVRFModule(vrfModule).requestDraw(address(this));
    }

    /// @notice Called back by NectarVRF with the verified random number.
    function fulfillDraw(uint256 randomWord) external onlyVrfModule {
        require(state == PoolState.DRAWING, "NectarPool: wrong phase");
        pendingRandomWord = randomWord;
        hasPendingRandomWord = true;
        _trySettleDraw(false);
    }

    /// @notice Backward-compatible test hook for older mock callers.
    function fulfillDraw(uint256 randomWord, uint256, uint256) external onlyVrfModule {
        require(state == PoolState.DRAWING, "NectarPool: wrong phase");
        pendingRandomWord = randomWord;
        hasPendingRandomWord = true;
        _trySettleDraw(false);
    }

    /// @notice Retry a DRAWING-phase settlement after a delayed Aave withdrawal.
    function retryDraw() external nonReentrant onlyState(PoolState.DRAWING) {
        require(hasPendingRandomWord, "NectarPool: no pending draw");
        _trySettleDraw(true);
    }

    function _trySettleDraw(bool retryDelayed) internal {
        uint256 randomWord = pendingRandomWord;
        (uint256 totalPrincipal, uint256 totalYield, bool success) = retryDelayed
            ? INectarVault(vault).retryWithdrawal(address(this))
            : INectarVault(vault).withdrawAndReturn(address(this));

        if (!success) return;

        pendingRandomWord = 0;
        hasPendingRandomWord = false;

        // If yield is below threshold, just settle with no prizes
        if (totalYield < MINIMUM_YIELD_THRESHOLD) {
            totalPrincipal;
            _settleNoPrize();
            return;
        }

        uint256 fee = NectarMath.protocolFee(totalYield);
        uint256 prizePool = NectarMath.winnersShare(totalYield);

        // Build eligible member list (not removed, completed savings)
        address[] memory eligible = _buildEligibleList();
        uint16 winnerCount = NectarMath.adjustedWinnerCount(currentWinnersCount, uint16(eligible.length));

        address[] memory winners = new address[](winnerCount);
        uint256 prizePerWinner = (winnerCount > 0) ? prizePool / winnerCount : 0;

        // Deterministic winner selection via modulo on random word
        bool[] memory picked = new bool[](eligible.length);
        for (uint16 i = 0; i < winnerCount; i++) {
            uint256 idx = uint256(keccak256(abi.encode(randomWord, i))) % eligible.length;
            // Resolve collision by linear probing
            while (picked[idx]) idx = (idx + 1) % eligible.length;
            picked[idx] = true;
            winners[i] = eligible[idx];
            claimable[eligible[idx]] += prizePerWinner;
        }

        // Non-winners get their principal back via claimable mapping
        for (uint256 i = 0; i < eligible.length; i++) {
            claimable[eligible[i]] += members[eligible[i]].totalPaid;
        }

        state = PoolState.SETTLED;
        emit WinnersDrawn(winners, prizePerWinner);
        emit PhaseTransitioned(PoolState.DRAWING, PoolState.SETTLED);
        _closeActiveMemberships(eligible);

        // Send protocol fee to factory treasury
        address treasury = _getTreasury();
        if (treasury != address(0) && fee > 0) {
            IERC20(config.token).safeTransfer(treasury, fee);
        }
    }

    // ─── Claim ────────────────────────────────────────────────────────────────

    function claim() external override nonReentrant {
        require(state == PoolState.SETTLED || state == PoolState.CANCELLED, "NectarPool: wrong phase");
        uint256 amount = claimable[msg.sender];
        require(amount > 0, "NectarPool: nothing to claim");
        claimable[msg.sender] = 0;
        members[msg.sender].hasClaimed = true;
        IERC20(config.token).safeTransfer(msg.sender, amount);
        emit FundsClaimed(msg.sender, amount);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @notice Returns current cycle computed lazily from timestamp.
    function currentCycle() public view override returns (uint16) {
        return NectarMath.computeCurrentCycle(poolStartTime, block.timestamp, config.cycleDuration);
    }

    /// @notice Returns (rate, canJoin) for a late joiner at current cycle.
    function calculateJoinRate(uint16 atCycle) external view override returns (uint256 rate, bool canJoin) {
        uint16 cyclesRemaining = NectarMath.remainingCycles(atCycle, config.totalCycles);
        uint256 perMember = NectarMath.perMemberTotal(config.targetAmount, config.maxMembers);
        uint256 baseRate = NectarMath.baseContribution(perMember, config.totalCycles);
        rate = NectarMath.lateJoinerRate(perMember, cyclesRemaining);

        canJoin = NectarMath.isAboveThreeCycleFloor(cyclesRemaining) && NectarMath.isWithinTwoXCap(rate, baseRate)
            && NectarMath.isWithinEnrollmentWindow(atCycle, config.totalCycles, uint8(config.enrollmentWindow))
            && activeMembers < config.maxMembers && state == PoolState.ENROLLMENT;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _takeDeposit(address member, uint16 cycle, uint256 amount) internal {
        MemberState storage m = members[member];

        // Final cycle rounding: if this is the last cycle, use finalCycleAmount
        uint16 joinedCycleCount = cycle - m.joinCycle + 1;
        uint16 totalCyclesForMember = config.totalCycles - m.joinCycle + 1;

        if (joinedCycleCount == totalCyclesForMember) {
            // Final cycle: accept the exact remainder to hit per-member total
            uint256 perMember = NectarMath.perMemberTotal(config.targetAmount, config.maxMembers);
            amount = NectarMath.finalCycleAmount(perMember, m.assignedRate, m.cyclesPaid);
        }

        IERC20(config.token).safeTransferFrom(member, address(this), amount);
        m.totalPaid += amount;
        m.cyclesPaid++;
        m.lastPaidCycle = cycle;

        emit DepositMade(member, cycle, amount);
    }

    function _isWithinContributionWindow(uint16 cycle) internal view returns (bool) {
        // Window closes some hours/days before the end of each cycle.
        // cycleDuration in seconds. Window closes at 75% of cycle elapsed.
        uint256 cycleStart = poolStartTime + (uint256(cycle - 1) * config.cycleDuration);
        uint256 windowClose = cycleStart + (config.cycleDuration * 3 / 4);
        return block.timestamp <= windowClose;
    }

    function _expectedDepositAmount(MemberState storage m, uint16) internal view returns (uint256) {
        // Grace period: if last paid was (cycle - 2), they owe (cycle - 1) now — handled by batchDeposit.
        // For normal single deposits, just the assigned rate is expected.
        return m.assignedRate;
    }

    function _adjustWinnersIfNeeded() internal {
        currentWinnersCount = NectarMath.adjustedWinnerCount(currentWinnersCount, activeMembers);
        if (currentWinnersCount == 0 && activeMembers <= 1) {
            _cancelPool("Not enough members remaining");
        }
    }

    /// @notice Publicly callable to trigger lazy eviction for a specific member.
    ///         Useful for keepers/tests to check missed cycles without a deposit tx.
    function checkAndEvict(address member) external nonReentrant {
        require(isMember[member], "NectarPool: not a member");
        _lazyEvict(member);
    }

    /// @notice Lazy eviction: if a member missed 2+ consecutive cycles, remove them and
    ///         queue their principal for refund. Called at the start of deposit/batchDeposit.
    function _lazyEvict(address member) internal {
        MemberState storage m = members[member];
        if (m.isRemoved) return;
        uint16 cycle = currentCycle();
        // Evict if missed 2+ CONSECUTIVE cycles.
        // A gap of 1 (lastPaidCycle+1 < cycle) is handled gracefully by batchDeposit.
        // A gap of 2+ means they missed 2 in a row and are evicted.
        // e.g. lastPaidCycle=2, currentCycle=5 → gap=3 → evict
        //      lastPaidCycle=2, currentCycle=4 → gap=2 → evict
        //      lastPaidCycle=2, currentCycle=3 → gap=1 → OK (batchDeposit territory)
        if (m.lastPaidCycle > 0 && cycle > m.lastPaidCycle + 2) {
            m.isRemoved = true;
            activeMembers--;
            claimable[member] = m.totalPaid; // queue their principal for refund
            _decrementActivePool(member);
            _adjustWinnersIfNeeded();
            emit MemberRemoved(member, m.totalPaid);
        }
    }

    /// @notice Lazy-transition from ENROLLMENT to SAVING once the enrollment window has closed.
    function _transitionToSavingIfNeeded() internal {
        if (state == PoolState.ENROLLMENT) {
            uint256 windowEnd = _enrollmentWindowEnd();
            if (block.timestamp > windowEnd) {
                state = PoolState.SAVING;
                emit PhaseTransitioned(PoolState.ENROLLMENT, PoolState.SAVING);
            }
        }
    }

    function _buildEligibleList() internal view returns (address[] memory eligible) {
        uint256 count = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (!members[memberList[i]].isRemoved) count++;
        }
        eligible = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (!members[memberList[i]].isRemoved) eligible[idx++] = memberList[i];
        }
    }

    function _settleNoPrize() internal {
        // Distribute principal back to every active member.
        address[] memory eligible = _buildEligibleList();
        for (uint256 i = 0; i < memberList.length; i++) {
            address m = memberList[i];
            if (!members[m].isRemoved) {
                claimable[m] = members[m].totalPaid;
            }
        }
        state = PoolState.SETTLED;
        emit PhaseTransitioned(PoolState.DRAWING, PoolState.SETTLED);
        _closeActiveMemberships(eligible);
    }

    function _cancelPool(string memory reason) internal {
        PoolState previousState = state;
        state = PoolState.CANCELLED;
        // Refund all active members
        address[] memory eligible = _buildEligibleList();
        for (uint256 i = 0; i < memberList.length; i++) {
            address m = memberList[i];
            if (!members[m].isRemoved && members[m].totalPaid > 0) {
                claimable[m] = members[m].totalPaid;
            }
        }
        emit PoolCancelled(reason);
        emit PhaseTransitioned(previousState, PoolState.CANCELLED);
        _closeActiveMemberships(eligible);
    }

    function _getTreasury() internal view returns (address treasury) {
        treasury = INectarFactory(factory).treasury();
    }

    function _enrollmentWindowEnd() internal view returns (uint256) {
        uint16 openCycles = NectarMath.enrollmentWindowCycles(config.totalCycles, uint8(config.enrollmentWindow));
        return poolStartTime + (uint256(openCycles) * config.cycleDuration);
    }

    function _incrementActivePool(address member) internal {
        try INectarFactory(factory).incrementActivePool(member) {}
        catch {
            revert("NectarPool: active pool increment failed");
        }
    }

    function _decrementActivePool(address member) internal {
        try INectarFactory(factory).decrementActivePool(member) {}
        catch {
            revert("NectarPool: active pool decrement failed");
        }
    }

    function _closeActiveMemberships(address[] memory membersToClose) internal {
        for (uint256 i = 0; i < membersToClose.length; i++) {
            _decrementActivePool(membersToClose[i]);
        }
    }
}
