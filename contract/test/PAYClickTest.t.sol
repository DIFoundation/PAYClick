// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PAYClick} from "../src/PAYClick.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract PAYClickTest is Test {
    PAYClick payclick;
    MockERC20 usdt;

    address owner;
    address treasury;
    address freelancer;
    address payer;

    uint128 constant AMOUNT = 1000e6; // 1000 USDT
    uint128 constant FEE = 10e6; // 1% = 10 USDT
    uint128 constant PAYOUT = 990e6;

    event PaymentLinkCreated(
        uint256 indexed linkId, address indexed creator, address indexed token, uint128 amount, string memo, uint64 expiry
    );
    event PaymentPaid(
        uint256 indexed linkId,
        address indexed payer,
        address indexed creator,
        address token,
        uint128 amount,
        uint128 fee,
        uint128 payout
    );
    event PaymentLinkCancelled(uint256 indexed linkId, address indexed creator);

    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        freelancer = makeAddr("freelancer");
        payer = makeAddr("payer");

        usdt = new MockERC20("Tether USD", "USDT", 6);
        payclick = new PAYClick(treasury, address(usdt));

        usdt.mint(payer, 10_000e6);
        vm.prank(payer);
        usdt.approve(address(payclick), type(uint256).max);
    }

    function _createLink(uint128 amount) internal returns (uint256 linkId) {
        vm.prank(freelancer);
        linkId = payclick.createPaymentLink(address(usdt), amount, "invoice #42", 0);
    }

    /*//////////////////////////////////////////////////////////////
                              CREATION
    //////////////////////////////////////////////////////////////*/

    function test_CreateLink() public {
        vm.expectEmit(true, true, true, true);
        emit PaymentLinkCreated(1, freelancer, address(usdt), AMOUNT, "invoice #42", 0);

        uint256 linkId = _createLink(AMOUNT);

        assertEq(linkId, 1);
        PAYClick.PaymentLink memory link = payclick.getLink(linkId);
        assertEq(link.creator, freelancer);
        assertEq(link.token, address(usdt));
        assertEq(link.amount, AMOUNT);
        assertEq(link.expiry, 0);
        assertEq(uint8(link.status), uint8(PAYClick.Status.Active));

        uint256[] memory ids = payclick.getCreatorLinks(freelancer);
        assertEq(ids.length, 1);
        assertEq(ids[0], linkId);
    }

    function test_CreateLink_RevertIfTokenNotSupported() public {
        MockERC20 fake = new MockERC20("Fake", "FAKE", 6);
        vm.prank(freelancer);
        vm.expectRevert(PAYClick.TokenNotSupported.selector);
        payclick.createPaymentLink(address(fake), AMOUNT, "memo", 0);
    }

    function test_CreateLink_RevertIfZeroAmount() public {
        vm.prank(freelancer);
        vm.expectRevert(PAYClick.InvalidAmount.selector);
        payclick.createPaymentLink(address(usdt), 0, "memo", 0);
    }

    function test_CreateLink_RevertIfExpiryInPast() public {
        vm.prank(freelancer);
        vm.expectRevert(PAYClick.InvalidExpiry.selector);
        payclick.createPaymentLink(address(usdt), AMOUNT, "memo", uint64(block.timestamp));
    }

    /*//////////////////////////////////////////////////////////////
                               PAYMENT
    //////////////////////////////////////////////////////////////*/

    function test_Pay() public {
        uint256 linkId = _createLink(AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit PaymentPaid(linkId, payer, freelancer, address(usdt), AMOUNT, FEE, PAYOUT);

        vm.prank(payer);
        payclick.pay(linkId);

        assertEq(usdt.balanceOf(treasury), FEE);
        assertEq(usdt.balanceOf(freelancer), PAYOUT);
        assertEq(usdt.balanceOf(payer), 10_000e6 - AMOUNT);
        assertEq(uint8(payclick.getLink(linkId).status), uint8(PAYClick.Status.Paid));
    }

    function test_Pay_RevertIfNotApproved() public {
        uint256 linkId = _createLink(AMOUNT);
        usdt.mint(freelancer, 0); // no-op, keep state clean
        vm.prank(freelancer);
        usdt.approve(address(payclick), 0); // freelancer has 0 approval anyway
        address nobody = makeAddr("nobody");
        usdt.mint(nobody, AMOUNT);
        vm.prank(nobody);
        vm.expectRevert(); // ERC20InsufficientAllowance
        payclick.pay(linkId);
    }

    function test_Pay_RevertIfInsufficientBalance() public {
        uint256 linkId = _createLink(AMOUNT);
        address broke = makeAddr("broke");
        vm.prank(broke);
        usdt.approve(address(payclick), AMOUNT);
        vm.prank(broke);
        vm.expectRevert(); // ERC20InsufficientBalance
        payclick.pay(linkId);
    }

    function test_Pay_RevertIfDoublePaid() public {
        uint256 linkId = _createLink(AMOUNT);
        vm.prank(payer);
        payclick.pay(linkId);
        vm.prank(payer);
        vm.expectRevert(PAYClick.LinkNotActive.selector);
        payclick.pay(linkId);
    }

    function test_Pay_RevertIfCancelled() public {
        uint256 linkId = _createLink(AMOUNT);
        vm.prank(freelancer);
        payclick.cancelPaymentLink(linkId);
        vm.prank(payer);
        vm.expectRevert(PAYClick.LinkNotActive.selector);
        payclick.pay(linkId);
    }

    function test_Pay_RevertIfExpired() public {
        uint64 expiry = uint64(block.timestamp + 1 days);
        vm.prank(freelancer);
        uint256 linkId = payclick.createPaymentLink(address(usdt), AMOUNT, "memo", expiry);

        vm.warp(expiry + 1);
        vm.prank(payer);
        vm.expectRevert(PAYClick.LinkExpired.selector);
        payclick.pay(linkId);
    }

    function test_Pay_SucceedsAtExpiryBoundary() public {
        uint64 expiry = uint64(block.timestamp + 1 days);
        vm.prank(freelancer);
        uint256 linkId = payclick.createPaymentLink(address(usdt), AMOUNT, "memo", expiry);

        vm.warp(expiry);
        vm.prank(payer);
        payclick.pay(linkId); // block.timestamp <= expiry still valid
        assertEq(usdt.balanceOf(freelancer), PAYOUT);
    }

    /*//////////////////////////////////////////////////////////////
                              CANCELLATION
    //////////////////////////////////////////////////////////////*/

    function test_Cancel() public {
        uint256 linkId = _createLink(AMOUNT);
        vm.expectEmit(true, true, false, false);
        emit PaymentLinkCancelled(linkId, freelancer);
        vm.prank(freelancer);
        payclick.cancelPaymentLink(linkId);
        assertEq(uint8(payclick.getLink(linkId).status), uint8(PAYClick.Status.Cancelled));
    }

    function test_Cancel_RevertIfNotCreator() public {
        uint256 linkId = _createLink(AMOUNT);
        vm.prank(payer);
        vm.expectRevert(PAYClick.NotCreator.selector);
        payclick.cancelPaymentLink(linkId);
    }

    function test_Cancel_RevertIfAlreadyPaid() public {
        uint256 linkId = _createLink(AMOUNT);
        vm.prank(payer);
        payclick.pay(linkId);
        vm.prank(freelancer);
        vm.expectRevert(PAYClick.LinkNotActive.selector);
        payclick.cancelPaymentLink(linkId);
    }

    /*//////////////////////////////////////////////////////////////
                                 ADMIN
    //////////////////////////////////////////////////////////////*/

    function test_SetFeeBps() public {
        payclick.setFeeBps(200);
        assertEq(payclick.feeBps(), 200);

        uint256 linkId = _createLink(AMOUNT);
        vm.prank(payer);
        payclick.pay(linkId);
        assertEq(usdt.balanceOf(treasury), 20e6); // 2%
        assertEq(usdt.balanceOf(freelancer), 980e6);
    }

    function test_SetFeeBps_RevertIfAboveCap() public {
        vm.expectRevert(PAYClick.FeeTooHigh.selector);
        payclick.setFeeBps(501); // cap is 500
        payclick.setFeeBps(500); // exactly at cap is fine
        assertEq(payclick.feeBps(), 500);
    }

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        payclick.setTreasury(newTreasury);
        assertEq(payclick.treasury(), newTreasury);

        uint256 linkId = _createLink(AMOUNT);
        vm.prank(payer);
        payclick.pay(linkId);
        assertEq(usdt.balanceOf(newTreasury), FEE);
        assertEq(usdt.balanceOf(treasury), 0);
    }

    function test_SetTreasury_RevertIfZero() public {
        vm.expectRevert(PAYClick.ZeroAddress.selector);
        payclick.setTreasury(address(0));
    }

    function test_TokenSupport() public {
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        payclick.setSupportedToken(address(usdc), true);

        vm.prank(freelancer);
        uint256 linkId = payclick.createPaymentLink(address(usdc), AMOUNT, "memo", 0);

        usdc.mint(payer, AMOUNT);
        vm.prank(payer);
        usdc.approve(address(payclick), AMOUNT);
        vm.prank(payer);
        payclick.pay(linkId);
        assertEq(usdc.balanceOf(freelancer), PAYOUT);

        // delisting blocks new links but does not brick unpaid existing ones
        payclick.setSupportedToken(address(usdc), false);
        vm.prank(freelancer);
        vm.expectRevert(PAYClick.TokenNotSupported.selector);
        payclick.createPaymentLink(address(usdc), AMOUNT, "memo", 0);
    }

    function test_RescueTokens() public {
        usdt.mint(address(payclick), 50e6); // accidental send
        address recovery = makeAddr("recovery");
        payclick.rescueTokens(address(usdt), recovery, 50e6);
        assertEq(usdt.balanceOf(recovery), 50e6);
        assertEq(usdt.balanceOf(address(payclick)), 0);
    }

    function test_Ownership() public {
        vm.prank(freelancer);
        vm.expectRevert();
        payclick.setFeeBps(200);
    }
}