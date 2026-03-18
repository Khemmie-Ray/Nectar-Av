// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INectarFactory {
    function treasury() external view returns (address);
    function incrementActivePool(address member) external;
    function decrementActivePool(address member) external;
    function isDeployedPool(address pool) external view returns (bool);
}
