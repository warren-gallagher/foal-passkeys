export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    return Buffer.from(uint8Array).toString('base64');
}
 
export function base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}