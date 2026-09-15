
export function truncateAddress(address: string, length = 6): string {
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

export function shortError(error: Error): string {
  const message = error.message.trim();
  const lines = message.split('\n');
  const shortMessage = lines.length > 1 ? lines[0] : message;
  return shortMessage.length > 80 ? `${shortMessage.slice(0, 80)}...` : shortMessage;
}

export function shareUrl(url: string): string {
  const input = document.createElement('input');
  input.value = url;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  return url;
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const formattedAmount = Number(amount) / Math.pow(10, decimals);
  return formattedAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function isValidLinkId(id: string): string {
  if (!id) {
    throw new Error('Invalid link ID: must be provided');
  }
  const num = BigInt(id);
  if (num < BigInt(1)) {
    throw new Error('Invalid link ID: must be a positive integer');
  }
  return id;
}