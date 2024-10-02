import crypto from 'crypto';

export async function decryptGameState(encryptedGameState: string): Promise<any> {
    if (!encryptedGameState) {
        return null;
    }

    const textParts = encryptedGameState.split(':');
    const iv = new Uint8Array(textParts.shift()!.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedText = new Uint8Array(textParts.join(':').match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const key = await window.crypto.subtle.importKey(
        "raw",
        new Uint8Array(import.meta.env.VITE_ENCRYPTION_KEY.match(/.{1,2}/g)!.map((byte : any) => parseInt(byte, 16))),
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        key,
        encryptedText
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
}