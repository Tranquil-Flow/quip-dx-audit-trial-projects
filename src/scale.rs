//! Minimal SCALE codec helpers (compact integers only — enough for this tool).

/// SCALE-compact encode a u128 (u32 and u64 use the same algorithm).
///
/// Note: parity-scale-codec (the reference implementation, and the one this
/// chain is built on) encodes the >2^30 "big integer" case with the data
/// bytes in LITTLE-endian order (verified against a live faucet extrinsic
/// on Aglais: 10 AGLS = 0x09184E72A000 was encoded as
/// 0b 00 a0 72 4e 18 09). Big-endian data is rejected by the runtime.
pub fn compact_u128(v: u128) -> Vec<u8> {
    let mut out = Vec::new();
    if v <= 0x3F {
        out.push((v as u8) << 2);
    } else if v <= 0x3FFF {
        let n = (v as u16) << 2 | 0b01;
        out.extend_from_slice(&n.to_le_bytes());
    } else if v <= 0x3FFF_FFFF {
        let n = (v as u32) << 2 | 0b10;
        out.extend_from_slice(&n.to_le_bytes());
    } else {
        let bytes = v.to_le_bytes();
        let mut len = 16;
        while len > 4 && bytes[len - 1] == 0 {
            len -= 1;
        }
        out.push(((len - 4) as u8) << 2 | 0b11);
        out.extend_from_slice(&bytes[..len]);
    }
    out
}

pub fn compact_u32(v: u32) -> Vec<u8> {
    compact_u128(v as u128)
}

/// Compact-encode a length (used for the extrinsic length prefix).
pub fn compact_len(len: usize) -> Vec<u8> {
    compact_u128(len as u128)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compact_vectors() {
        assert_eq!(compact_u128(0), vec![0x00]);
        assert_eq!(compact_u128(63), vec![0xFC]);
        assert_eq!(compact_u128(64), vec![0x01, 0x01]);
        assert_eq!(compact_u128(16383), vec![0xFD, 0xFF]);
        assert_eq!(compact_u128(16384), vec![0x02, 0x00, 0x01, 0x00]);
        assert_eq!(compact_u128(1_073_741_823), vec![0xFE, 0xFF, 0xFF, 0xFF]);
        // 10^12 = 0xE8D4A51000 -> LE data bytes 00 10 A5 D4 E8 (5 bytes)
        assert_eq!(
            compact_u128(1_000_000_000_000u128),
            vec![0x07, 0x00, 0x10, 0xA5, 0xD4, 0xE8]
        );
        // 10^13 = 0x9184E72A000 -> matches the live faucet extrinsic encoding
        assert_eq!(
            compact_u128(10_000_000_000_000u128),
            vec![0x0B, 0x00, 0xA0, 0x72, 0x4E, 0x18, 0x09]
        );
        assert_eq!(compact_u32(1), vec![0x04]);
    }
}
