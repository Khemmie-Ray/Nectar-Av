// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {INectarFactory} from "./interfaces/INectarFactory.sol";
import {INectarPool} from "./interfaces/INectarPool.sol";
import {IVRFCoordinatorV2Plus} from "./interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "./libraries/VRFV2PlusClient.sol";

/// @title ChainlinkVRFModule
/// @notice Production randomness adapter for Nectar pools using Chainlink VRF v2.5.
/// @dev This contract is deployed separately from the factory so chain-specific
///      coordinator and subscription parameters can be configured explicitly.
contract ChainlinkVRFModule is Ownable {
    using VRFV2PlusClient for VRFV2PlusClient.ExtraArgsV1;

    uint32 public constant NUM_WORDS = 1;

    address public immutable FACTORY;
    address public immutable COORDINATOR;

    bytes32 public keyHash;
    uint256 public subscriptionId;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    bool public nativePayment;

    mapping(uint256 => address) public requestToPool;

    event DrawRequested(uint256 indexed requestId, address indexed pool);
    event DrawFulfilled(uint256 indexed requestId, address indexed pool, uint256 randomWord);
    event RequestConfigUpdated(
        bytes32 keyHash,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        uint16 requestConfirmations,
        bool nativePayment
    );

    constructor(
        address _factory,
        address _coordinator,
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    ) Ownable(msg.sender) {
        require(_factory != address(0), "ChainlinkVRFModule: zero factory");
        require(_coordinator != address(0), "ChainlinkVRFModule: zero coordinator");
        require(_callbackGasLimit > 0, "ChainlinkVRFModule: zero callback gas");
        require(_requestConfirmations > 0, "ChainlinkVRFModule: zero confirmations");

        FACTORY = _factory;
        COORDINATOR = _coordinator;
        _setRequestConfig(_keyHash, _subscriptionId, _callbackGasLimit, _requestConfirmations, _nativePayment);
    }

    function requestDraw(address pool) external returns (uint256 requestId) {
        require(msg.sender == pool, "ChainlinkVRFModule: caller not pool");
        require(INectarFactory(FACTORY).isDeployedPool(pool), "ChainlinkVRFModule: unknown pool");

        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: NUM_WORDS,
            extraArgs: VRFV2PlusClient.ExtraArgsV1({nativePayment: nativePayment})._argsToBytes()
        });

        requestId = IVRFCoordinatorV2Plus(COORDINATOR).requestRandomWords(req);
        requestToPool[requestId] = pool;

        emit DrawRequested(requestId, pool);
    }

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == COORDINATOR, "ChainlinkVRFModule: caller not coordinator");
        address pool = requestToPool[requestId];
        require(pool != address(0), "ChainlinkVRFModule: unknown request");
        require(randomWords.length > 0, "ChainlinkVRFModule: missing random words");

        delete requestToPool[requestId];
        INectarPool(pool).fulfillDraw(randomWords[0]);

        emit DrawFulfilled(requestId, pool, randomWords[0]);
    }

    function setRequestConfig(
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    ) external onlyOwner {
        _setRequestConfig(_keyHash, _subscriptionId, _callbackGasLimit, _requestConfirmations, _nativePayment);
    }

    function _setRequestConfig(
        bytes32 _keyHash,
        uint256 _subscriptionId,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        bool _nativePayment
    ) internal {
        require(_callbackGasLimit > 0, "ChainlinkVRFModule: zero callback gas");
        require(_requestConfirmations > 0, "ChainlinkVRFModule: zero confirmations");

        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        nativePayment = _nativePayment;

        emit RequestConfigUpdated(_keyHash, _subscriptionId, _callbackGasLimit, _requestConfirmations, _nativePayment);
    }

    function factory() external view returns (address) {
        return FACTORY;
    }

    function coordinator() external view returns (address) {
        return COORDINATOR;
    }
}
