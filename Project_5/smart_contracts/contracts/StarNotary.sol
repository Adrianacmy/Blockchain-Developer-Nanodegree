pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';

contract StarNotary is ERC721 {
    struct Star {
        string name;
        string story;
        string ra;
        string dec;
        string mag;
        string cent;
        // mapping(string => Coordinator) coor;
    }

    mapping(uint256 => Star) public tokenIdToStarInfo;
    mapping(uint256 => uint256) public starsForSale;
    mapping(bytes32 => bool) public coordHash;
    mapping(uint => address) public tokenToOwner;
    mapping(uint256 => address) tokenToApproved;
    mapping(address => uint256) ownerToBalance;
    mapping(address => mapping(address => bool)) ownerToOperator;

    // Mapping from token ID to approved address
    mapping (uint256 => address) private _tokenApprovals;

     // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IERC721Receiver(0).onERC721Received.selector`
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    modifier hasPermission(address _caller, uint256 _tokenId) {
        require(_caller == tokenToOwner[_tokenId]
        || getApproved(_tokenId) == _caller
        || isApprovedForAll(tokenToOwner[_tokenId], _caller));
        _;
    }

    function generateCoordsHash(string _ra, string _dec, string _mag, string _cent)
        public
        pure
        returns(bytes32)
    {
        return keccak256(abi.encodePacked(_ra, _dec, _mag, _cent));
    }


    function isEmpty(string _val)
        public
        pure
        returns(bool)
        {
        return keccak256(abi.encodePacked(_val)) == keccak256(abi.encodePacked(""));
    }


    function checkIfStarExist(string _ra, string _dec, string _mag, string _cent)
        public
        view
        returns(bool){
        return coordHash[generateCoordsHash(_ra, _dec, _mag, _cent)];
    }

    function createStar(string _name, string _story, string _ra, string _dec, string _mag, string _cent, uint256 _tokenId)
        public
        {
        require(_tokenId != 0, "tokenId can not be 0");
        require(!isEmpty(_ra) || !isEmpty(_dec) || !isEmpty(_mag) || !isEmpty(_cent), "ra, dec, mag can not be empty");

        require(!checkIfStarExist(_ra, _dec, _mag, _cent), "This star aready registered");

        Star memory newStar = Star({name:_name, story: _story, ra: _ra, dec: _dec, mag: _mag, cent: _cent});

        tokenIdToStarInfo[_tokenId] = newStar;
        tokenToOwner[_tokenId] = msg.sender;

        coordHash[generateCoordsHash(_ra, _dec, _mag, _cent)] = true;

        mint(_tokenId);
    }


    function starsForSale(uint256 _starId) public view returns(uint256){
        return starsForSale[_starId];
    }

    function putStarUpForSale(uint256 _starId, uint256 _price)
        public
        {
        require(ownerOf(_starId) == msg.sender, "You have to be the owner of this star for this operation");

        starsForSale[_starId] = _price;
        // starsForSale(_starId, _price);
    }


    function buyStar(uint256 _tokenId) public payable {
        require(starsForSale[_tokenId] > 0, "This star is not for sale yet.");

        uint256 starCost = starsForSale[_tokenId];
        address starOwner = ownerOf(_tokenId);
        require(msg.value >= starCost, "Not enough funds to buy this star");

        _removeTokenFrom(starOwner, _tokenId);
        _addTokenTo(msg.sender, _tokenId);

        starOwner.transfer(starCost);

        if(msg.value > starCost) {
            msg.sender.transfer(msg.value - starCost);
        }
    }

    function tokenIdToStarInfo(uint256 _tokenId) public view returns(string, string, string, string, string, string){
        return (tokenIdToStarInfo[_tokenId].name,
            tokenIdToStarInfo[_tokenId].story,
            tokenIdToStarInfo[_tokenId].ra,
            tokenIdToStarInfo[_tokenId].dec,
            tokenIdToStarInfo[_tokenId].mag,
            tokenIdToStarInfo[_tokenId].cent);
    }

    function mint(uint256 _tokenId) public {
        super._mint(msg.sender, _tokenId);
    }


    /**
        @notice Find the owner of an NFT
        @dev NFTs assigned to zero address are considered invalid, and queries
        about them do throw.
        @param _tokenId The identifier for an NFT
        @return The address of the owner of the NFT

    */
    function ownerOf(uint256 _tokenId)
        public
        view
        returns (address)
    {
        return super.ownerOf(_tokenId);
    }

    /**
        @notice Change or reaffirm the approved address for an NFT
        @dev The zero address indicates there is no approved address.
        Throws unless `msg.sender` is the current NFT owner, or an authorized
        operator of the current owner.
        @param _approved The new approved NFT controller
        @param _tokenId The NFT to approve

     */
    function approve(address _approved, uint256 _tokenId) public {
        require(tokenToOwner[_tokenId] == msg.sender);

        tokenToApproved[_tokenId] = _approved;

        emit Approval(msg.sender, _approved, _tokenId);
    }


    /**
        @notice Get the approved address for a single NFT
        @dev Throws if `_tokenId` is not a valid NFT.
        @param _tokenId The NFT to find the approved address for
        @return The approved address for this NFT, or the zero address if there is none
     */
    function getApproved(uint256 _tokenId)
        public
        view
        returns (address)
        {
        return tokenToApproved[_tokenId];
    }

    /**
        @notice Enable or disable approval for a third party ("operator") to manage
        all of `msg.sender`'s assets
        @dev Emits the ApprovalForAll event. The contract MUST allow
        multiple operators per owner.
        @param _operator Address to add to the set of authorized operators
        @param _approved True if the operator is approved, false to revoke approval
     */
    function setApprovalForAll(address _operator, bool _approved)
        public
    {
        ownerToOperator[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
        // ERC721.setApprovalForAll(_operator, _approved);
    }

    /**
        @notice Query if an address is an authorized operator for another address
        @param _owner The address that owns the NFTs
        @param _operator The address that acts on behalf of the owner
        @return True if `_operator` is an approved operator for `_owner`, false otherwise

     */
    function isApprovedForAll(address _owner, address _operator)        public
        view
        returns (bool)
        {
        return ownerToOperator[_owner][_operator];

    }
    /**
        * @dev Safely transfers the ownership of a given token ID to another address
        * If the target address is a contract, it must implement `onERC721Received`,
        * which is called upon a safe transfer, and return the magic value
        * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
        * the transfer is reverted.
        * Requires the msg sender to be the owner, approved, or operator
        * @param from current owner of the token
        * @param to address to receive the ownership of the given token ID
        * @param tokenId uint256 ID of the token to be transferred
        * @param _data bytes data to send along with a safe transfer check
    */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes _data
    )
        public
    {
        transferFrom(from, to, tokenId);
        // solium-disable-next-line arg-overflow
        require(_checkAndCallSafeTransfer(from, to, tokenId, _data));
    }

    /**
        * @dev Safely transfers the ownership of a given token ID to another address
        * If the target address is a contract, it must implement `onERC721Received`,
        * which is called upon a safe transfer, and return the magic value
        * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
        * the transfer is reverted.
        *
        * Requires the msg sender to be the owner, approved, or operator
        * @param from current owner of the token
        * @param to address to receive the ownership of the given token ID
        * @param tokenId uint256 ID of the token to be transferred
    */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    )
        public
        hasPermission(from, tokenId)
    {
        // solium-disable-next-line arg-overflow
        safeTransferFrom(from, to, tokenId, "");
    }


    /**
        @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
        TO CONFIRM THAT `_to` IS CAPABLE OF RECEIVING NFTS OR ELSE
        THEY MAY BE PERMANENTLY LOST
        @dev Throws unless `msg.sender` is the current owner, an authorized
        operator, or the approved address for this NFT. Throws if `_from` is
        not the current owner. Throws if `_to` is the zero address. Throws if
        `_tokenId` is not a valid NFT.
        @param from The current owner of the NFT
        @param to The new owner
        @param tokenId The NFT to transfer

     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    )
        public
    {
        require(_isApprovedOrOwner(msg.sender, tokenId));
        require(to != address(0));

        _clearApproval(from, tokenId);
        _removeTokenFrom(from, tokenId);
        _addTokenTo(to, tokenId);

        emit Transfer(from, to, tokenId);
    }

}