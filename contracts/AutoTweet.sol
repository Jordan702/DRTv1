// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AutoTweet {
    event Tweet(string message);

    function broadcast(string calldata message) external {
        emit Tweet(message);
    }
}
