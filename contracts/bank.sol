//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Bank is Ownable {
    IERC20 private _utility;
    uint256 private _deployedTime;
    uint256 private _interval;

    struct RewardPool {
        uint256 first;
        uint256 second;
        uint256 third;
    }

    RewardPool public rewardPool;

    mapping(address => uint256) public users;

    constructor(address utilAddr, uint256 rewardAmount, uint256 interval) {
        _utility = IERC20(utilAddr);
        _interval = interval;
        rewardPool.first = rewardAmount * 20 / 100;
        rewardPool.second = rewardAmount * 30 / 100;
        rewardPool.third = rewardAmount * 50 / 100;
        _deployedTime = block.timestamp;
    }

    function deposit(uint256 amount) external {
        uint256 diff = block.timestamp - _deployedTime;
        require(diff < _interval, "Deposit Not allowed");

        users[msg.sender] = amount;
        _utility.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw() external {
        require(tx.origin == msg.sender, "Contract Call now allowed");

        uint256 diff = block.timestamp - _deployedTime;
        require(diff > 2 * _interval, "Withdraw Not allowed");

        uint256 reward;
        uint256 totalStaked = _utility.balanceOf(address(this)) - (rewardPool.first + rewardPool.second + rewardPool.third);
        uint256 stakedRate = 100 * users[msg.sender] / totalStaked;

        if ( diff < 3 * _interval ) {
            uint256 reward1;
            reward1 = rewardPool.first * stakedRate / 100;
            rewardPool.first -= reward1;
            reward = reward1;
        }
        else if ( diff < 4 * _interval ) {
            uint256 reward1;
            uint256 reward2;
            reward1 = rewardPool.first * stakedRate / 100;
            reward2 = rewardPool.second * stakedRate / 100;
            rewardPool.first -= reward1;
            rewardPool.second -= reward2;
            reward = reward1 + reward2;
        }
        else if ( diff < 5 * _interval ) {
            uint256 reward1;
            uint256 reward2;
            uint256 reward3;
            reward1 = rewardPool.first * stakedRate / 100;
            reward2 = rewardPool.second * stakedRate / 100;
            reward3 = rewardPool.third * stakedRate / 100;
            rewardPool.first -= reward1;
            rewardPool.second -= reward2;
            reward = reward1 + reward2 + reward3;
        }

        _utility.transfer(msg.sender, users[msg.sender] + reward);
    }

    function withdrawalByOwner() external onlyOwner {
        require(tx.origin == msg.sender, "Contract Call now allowed");
        _utility.transfer(msg.sender, _utility.balanceOf(address(this)));
    }
}