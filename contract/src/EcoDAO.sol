// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * EcoDAO main contract.
 * SubDAO is represented as ERC721 token with reduction progress.
 */
contract EcoDAO is ERC721, Ownable, EIP712 {
    using Strings for uint256;

    struct SubDAO {
        string title;
        string description;
        uint256 targetAmount; // grams
        uint256 currentAmount; // grams
        string uncompletedImageURI;
        string completedImageURI;
        bool isCompleted;
        uint256 parentId;
        address admin;
    }

    struct Claim {
        address user;
        uint256 daoId;
        uint256 amount;
        bytes32 evidenceHash;
        uint256 nonce;
        uint256 expiresAt;
    }

    // SubDAO state
    mapping(uint256 => SubDAO) public daos;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) public daoMembers;

    uint256 private _nextTokenId = 1;

    // Attestation verifier (backend signer)
    address public verifier;
    mapping(uint256 => bool) public usedNonce;

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256(
            "Claim(address user,uint256 daoId,uint256 amount,bytes32 evidenceHash,uint256 nonce,uint256 expiresAt)"
        );

    // Events
    event DAOCreated(
        uint256 indexed tokenId,
        address indexed admin,
        string title,
        uint256 targetAmount
    );
    event ContributionReceived(
        uint256 indexed tokenId,
        address indexed contributor,
        uint256 amount,
        uint256 totalAmount
    );
    event DAOCompleted(uint256 indexed tokenId, uint256 finalAmount);
    event DAOSplit(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        address indexed newAdmin
    );

    /**
     * Check token existence (OpenZeppelin v5 style).
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    constructor(address initialOwner, address initialVerifier)
        ERC721("EcoDAO SubDAO", "ECOSUB")
        Ownable(initialOwner)
        EIP712("EcoDAO", "1")
    {
        verifier = initialVerifier;
    }

    // ----- View functions -----

    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    // Simple dynamic tokenURI based on completion state.
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Nonexistent token");
        SubDAO memory dao = daos[tokenId];
        return dao.isCompleted
            ? dao.completedImageURI
            : dao.uncompletedImageURI;
    }

    // ----- Admin -----

    function setVerifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "Invalid verifier");
        verifier = newVerifier;
    }

    // ----- Core write functions -----

    function createSubDAO(
        string memory title,
        string memory description,
        uint256 targetAmount,
        string memory uncompletedURI,
        string memory completedURI
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(targetAmount > 0, "Target must be > 0");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        daos[tokenId] = SubDAO({
            title: title,
            description: description,
            targetAmount: targetAmount,
            currentAmount: 0,
            uncompletedImageURI: uncompletedURI,
            completedImageURI: completedURI,
            isCompleted: false,
            parentId: 0,
            admin: msg.sender
        });

        // First member is admin
        daoMembers[tokenId].push(msg.sender);

        emit DAOCreated(tokenId, msg.sender, title, targetAmount);
        return tokenId;
    }

    function contribute(uint256 tokenId, uint256 amount) external {
        _contribute(msg.sender, tokenId, amount);
    }

    function _contribute(
        address contributor,
        uint256 tokenId,
        uint256 amount
    ) internal {
        require(_exists(tokenId), "DAO does not exist");
        require(amount > 0, "Amount must be > 0");

        SubDAO storage dao = daos[tokenId];

        // Add member if first contribution
        if (contributions[tokenId][contributor] == 0) {
          daoMembers[tokenId].push(contributor);
        }

        contributions[tokenId][contributor] += amount;
        dao.currentAmount += amount;

        emit ContributionReceived(
            tokenId,
            contributor,
            amount,
            dao.currentAmount
        );

        if (!dao.isCompleted && dao.currentAmount >= dao.targetAmount) {
            dao.isCompleted = true;
            emit DAOCompleted(tokenId, dao.currentAmount);
        }
    }

    function splitDAO(uint256 originalTokenId) external returns (uint256) {
        require(_exists(originalTokenId), "DAO does not exist");
        SubDAO storage original = daos[originalTokenId];
        require(msg.sender == original.admin, "Only admin can split");
        require(original.isCompleted, "DAO must be completed to split");

        uint256 newTokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, newTokenId);

        daos[newTokenId] = SubDAO({
            title: original.title,
            description: original.description,
            targetAmount: original.targetAmount,
            currentAmount: 0,
            uncompletedImageURI: original.uncompletedImageURI,
            completedImageURI: original.completedImageURI,
            isCompleted: false,
            parentId: originalTokenId,
            admin: msg.sender
        });

        daoMembers[newTokenId].push(msg.sender);

        emit DAOSplit(originalTokenId, newTokenId, msg.sender);
        return newTokenId;
    }

    // ----- Attestation-based contribution -----

    function submitClaim(
        address user,
        uint256 daoId,
        uint256 amount,
        bytes32 evidenceHash,
        uint256 nonce,
        uint256 expiresAt,
        bytes calldata signature
    ) external {
        require(block.timestamp <= expiresAt, "Claim expired");
        require(!usedNonce[nonce], "Nonce already used");
        require(user != address(0), "Invalid user");

        Claim memory claim = Claim({
            user: user,
            daoId: daoId,
            amount: amount,
            evidenceHash: evidenceHash,
            nonce: nonce,
            expiresAt: expiresAt
        });

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claim.user,
                claim.daoId,
                claim.amount,
                claim.evidenceHash,
                claim.nonce,
                claim.expiresAt
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == verifier, "Invalid signer");

        // Optionally require that msg.sender is the same as claim.user
        require(msg.sender == user, "Sender must be claim user");

        usedNonce[nonce] = true;

        _contribute(user, daoId, amount);
    }
}
