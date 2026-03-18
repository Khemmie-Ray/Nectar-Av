// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IVRFCoordinatorV2Plus} from "../interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "../libraries/VRFV2PlusClient.sol";

contract MockVRFCoordinatorV2Plus is IVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;

    event RandomWordsRequested(uint256 indexed requestId, address indexed requester);

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        emit RandomWordsRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(address consumer, uint256 requestId, uint256 randomWord) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;

        (bool ok,) =
            consumer.call(abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords));
        require(ok, "MockVRFCoordinatorV2Plus: fulfill failed");
    }
}
