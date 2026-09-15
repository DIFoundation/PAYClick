// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PAYClick} from "../src/PAYClick.sol";

/// @notice Deploy: forge script script/DeployPAYClick.s.sol --broadcast --verify --rpc-url <rpc>
contract DeployPAYClick is Script {
    function run() external returns (PAYClick) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address usdt = vm.envAddress("USDT_ADDRESS_TESTNET");

        vm.startBroadcast(deployerPrivateKey);
        PAYClick payclick = new PAYClick(treasury, usdt);
        vm.stopBroadcast();

        console2.log("PAYClick deployed at:", address(payclick));
        console2.log("Treasury:", payclick.treasury());
        console2.log("Fee (bps):", payclick.feeBps());
        return payclick;
    }
}