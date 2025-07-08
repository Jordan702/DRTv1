// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AutoStation {
    // Event for when a new station is "registered" (first message posted to it)
    event StationRegistered(string indexed channel, address indexed creator);
    // Existing Broadcast event
    event Broadcast(string indexed channel, address indexed user, string message);

    // To keep track if a channel has ever been used (optional, but good for clarity)
    mapping(string => bool) public isChannelRegistered;

    function postMessage(string calldata channel, string calldata message) external {
        // If this channel hasn't been used before, emit a registration event
        if (!isChannelRegistered[channel]) {
            isChannelRegistered[channel] = true;
            emit StationRegistered(channel, msg.sender);
        }
        emit Broadcast(channel, msg.sender, message);
    }

    // You might also add a getter for stations if you want to explicitly list them
    // This is more complex as you can't easily iterate through all keys in a mapping.
    // For a simple list, you might need an array and push channel names to it.
}
