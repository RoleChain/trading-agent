import { ethers } from 'ethers';

export const fromReadableAmount = (amount: number, decimals: number): string => {
  return ethers.utils.parseUnits(amount.toString(), decimals).toString();
};

export const toReadableAmount = (rawAmount: string, decimals: number): string => {
  return ethers.utils.formatUnits(rawAmount, decimals);
}; 