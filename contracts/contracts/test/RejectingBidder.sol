// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKhetChainBidding {
    function placeBid(uint256 batchId) external payable;
}

/// @dev Test helper: a bidder whose receive() always reverts, used to prove a
/// hostile bidder cannot block a sale by refusing refunds.
contract RejectingBidder {
    function bid(address market, uint256 batchId) external payable {
        IKhetChainBidding(market).placeBid{value: msg.value}(batchId);
    }

    receive() external payable {
        revert("no refunds");
    }
}
