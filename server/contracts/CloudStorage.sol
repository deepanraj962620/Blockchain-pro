// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CloudStorage {
    struct FileRecord {
        string name;
        string fileHash;
        string cid;
        address owner;
        uint256 uploadedAt;
        bool deleted;
    }

    mapping(uint256 => FileRecord) public files;
    uint256 public fileCount;

    event FileStored(uint256 indexed id, string name, string fileHash, string cid, address owner);
    event FileDeleted(uint256 indexed id);

    function addFile(string memory name, string memory fileHash, string memory cid, address owner) public returns (bool) {
        fileCount++;
        files[fileCount] = FileRecord(name, fileHash, cid, owner, block.timestamp, false);
        emit FileStored(fileCount, name, fileHash, cid, owner);
        return true;
    }

    function deleteFile(uint256 id) public {
        require(files[id].owner == msg.sender || msg.sender == address(0), 'not owner');
        files[id].deleted = true;
        emit FileDeleted(id);
    }
}
