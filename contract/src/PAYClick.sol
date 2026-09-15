// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title PAYClick — 1-click stablecoin payment links on BOT Chain.
/// @dev Links are created on-chain. Payments are exact-amount, one-time, final.
///      Fee is deducted from creator payout. Contract never custody user funds.
contract PAYClick is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant FEE_PRECISION = 10_000;
    uint16 public constant MAX_FEE_BPS = 500; // hard 5% cap, owner can never exceed

    enum Status { Active, Paid, Cancelled }

    struct PaymentLink {
        address creator;
        address token;
        uint128 amount;
        uint64 expiry;   // 0 = never expires
        Status status;
    }

    uint16 public feeBps = 100; // 1%
    address public treasury;

    uint256 private _nextLinkId; // first link = id 1
    mapping(uint256 => PaymentLink) public links;
    mapping(address => uint256[]) public creatorLinks; // dashboard helper
    mapping(address => bool) public supportedTokens;   // allowlist

    event PaymentLinkCreated(uint256 indexed linkId, address indexed creator,
        address indexed token, uint128 amount, string memo, uint64 expiry);
    event PaymentPaid(uint256 indexed linkId, address indexed payer, address indexed creator,
        address token, uint128 amount, uint128 fee, uint128 payout);
    event PaymentLinkCancelled(uint256 indexed linkId, address indexed creator);
    event TokenSupportUpdated(address indexed token, bool supported);
    event FeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error ZeroAddress();
    error TokenNotSupported();
    error InvalidAmount();
    error InvalidExpiry();
    error LinkNotActive();
    error LinkExpired();
    error NotCreator();
    error FeeTooHigh();

    constructor(address initialTreasury, address initialToken) Ownable(msg.sender) {
        if (initialTreasury == address(0) || initialToken == address(0)) revert ZeroAddress();
        treasury = initialTreasury;
        supportedTokens[initialToken] = true;
    }

    /// @notice Create a payment link; caller is the payee. Returns id for the URL: /pay/<linkId>
    function createPaymentLink(address token, uint128 amount, string calldata memo, uint64 expiry)
        external returns (uint256 linkId)
    {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (amount == 0) revert InvalidAmount();
        if (expiry != 0 && expiry <= block.timestamp) revert InvalidExpiry();

        linkId = ++_nextLinkId;
        links[linkId] = PaymentLink(msg.sender, token, amount, expiry, Status.Active);
        creatorLinks[msg.sender].push(linkId);
        emit PaymentLinkCreated(linkId, msg.sender, token, amount, memo, expiry);
    }

    function cancelPaymentLink(uint256 linkId) external {
        PaymentLink storage link = links[linkId];
        if (link.creator != msg.sender) revert NotCreator();
        if (link.status != Status.Active) revert LinkNotActive();
        link.status = Status.Cancelled;
        emit PaymentLinkCancelled(linkId, msg.sender);
    }

    /// @notice Settle a link. Payer must approve this contract for `amount` first.
    ///         Effects-before-interactions; fee -> treasury, payout -> creator. Final.
    function pay(uint256 linkId) external nonReentrant {
        PaymentLink storage link = links[linkId];
        if (link.status != Status.Active) revert LinkNotActive();
        if (link.expiry != 0 && block.timestamp > link.expiry) revert LinkExpired();

        link.status = Status.Paid; // mark first

        uint128 fee = uint128((uint256(link.amount) * feeBps) / FEE_PRECISION);
        IERC20 token = IERC20(link.token);
        token.safeTransferFrom(msg.sender, treasury, fee);
        token.safeTransferFrom(msg.sender, link.creator, link.amount - fee);

        emit PaymentPaid(linkId, msg.sender, link.creator, link.token, link.amount, fee, link.amount - fee);
    }

    function getLink(uint256 linkId) external view returns (PaymentLink memory) { return links[linkId]; }
    function getCreatorLinks(address creator) external view returns (uint256[] memory) { return creatorLinks[creator]; }

    // ---- Admin (owner) ----
    function setSupportedToken(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @dev User funds are never held (pay moves them atomically), so this only sweeps stranded tokens.
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
}