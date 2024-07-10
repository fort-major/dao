use std::{
    fmt::Display,
    ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Rem, Sub, SubAssign},
};

use candid::{CandidType, Nat};
use ic_stable_structures::{storable::Bound, Storable};
use num_bigint::BigUint;
use serde::Deserialize;

/// Fixed-point (8 digits) decimals with primitive math (+-*/) implemented correctly
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Default, Hash)]
pub struct E8s(pub Nat);

impl E8s {
    pub fn zero() -> Self {
        Self(Nat::from(0u32))
    }

    pub fn f0_1() -> Self {
        Self(Nat::from(1000_0000u64))
    }

    pub fn f0_2() -> Self {
        Self(Nat::from(2000_0000u64))
    }

    pub fn f0_25() -> Self {
        Self(Nat::from(2500_0000u64))
    }

    pub fn f0_3() -> Self {
        Self(Nat::from(3000_0000u64))
    }

    pub fn f0_33() -> Self {
        Self(Nat::from(3333_3333u64))
    }

    pub fn f0_4() -> Self {
        Self(Nat::from(4000_0000u64))
    }

    pub fn f0_5() -> Self {
        Self(Nat::from(5000_0000u64))
    }

    pub fn f0_6() -> Self {
        Self(Nat::from(6000_0000u64))
    }

    pub fn f0_67() -> Self {
        Self(Nat::from(6666_6667u64))
    }

    pub fn f0_7() -> Self {
        Self(Nat::from(7000_0000u64))
    }

    pub fn f0_75() -> Self {
        Self(Nat::from(7500_0000u64))
    }

    pub fn f0_8() -> Self {
        Self(Nat::from(8000_0000u64))
    }

    pub fn f0_9() -> Self {
        Self(Nat::from(9000_0000u64))
    }

    pub fn one() -> Self {
        Self(Nat::from(1_0000_0000u64))
    }

    pub fn sqrt(&self) -> Self {
        let whole = self.0.clone() / Nat::from(1_0000_0000u64);

        Self(Nat(whole.0.sqrt()) * Nat::from(1_0000_0000u64))
    }
}

impl Display for E8s {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let one = Self::one();

        f.write_str(&format!(
            "{}.{}",
            (&self.0 .0).div(&one.0 .0),
            (&self.0 .0).rem(&one.0 .0)
        ))
    }
}

impl Add for &E8s {
    type Output = E8s;

    fn add(self, rhs: Self) -> Self::Output {
        E8s(Nat((&self.0 .0).add(&rhs.0 .0)))
    }
}

impl Add for E8s {
    type Output = E8s;

    fn add(self, rhs: Self) -> Self::Output {
        (&self).add(&rhs)
    }
}

impl Add<&E8s> for E8s {
    type Output = E8s;

    fn add(self, rhs: &E8s) -> Self::Output {
        (&self).add(rhs)
    }
}

impl Add<E8s> for &E8s {
    type Output = E8s;

    fn add(self, rhs: E8s) -> Self::Output {
        self.add(&rhs)
    }
}

impl AddAssign<&E8s> for E8s {
    fn add_assign(&mut self, rhs: &E8s) {
        self.0 .0.add_assign(&rhs.0 .0)
    }
}

impl AddAssign for E8s {
    fn add_assign(&mut self, rhs: Self) {
        self.add_assign(&rhs)
    }
}

impl Sub for &E8s {
    type Output = E8s;

    fn sub(self, rhs: Self) -> Self::Output {
        E8s(Nat((&self.0 .0).sub(&rhs.0 .0)))
    }
}

impl Sub for E8s {
    type Output = E8s;

    fn sub(self, rhs: Self) -> Self::Output {
        (&self).sub(&rhs)
    }
}

impl Sub<&E8s> for E8s {
    type Output = E8s;

    fn sub(self, rhs: &E8s) -> Self::Output {
        (&self).sub(rhs)
    }
}

impl Sub<E8s> for &E8s {
    type Output = E8s;

    fn sub(self, rhs: E8s) -> Self::Output {
        self.sub(&rhs)
    }
}

impl SubAssign<&E8s> for E8s {
    fn sub_assign(&mut self, rhs: &E8s) {
        self.0 .0.sub_assign(&rhs.0 .0)
    }
}

impl SubAssign for E8s {
    fn sub_assign(&mut self, rhs: Self) {
        self.sub_assign(&rhs)
    }
}

impl Mul for &E8s {
    type Output = E8s;

    fn mul(self, rhs: Self) -> Self::Output {
        E8s(Nat((&self.0 .0).mul(&rhs.0 .0).div(E8s::one().0 .0)))
    }
}

impl Mul for E8s {
    type Output = E8s;

    fn mul(self, rhs: Self) -> Self::Output {
        (&self).mul(&rhs)
    }
}

impl Mul<&E8s> for E8s {
    type Output = E8s;

    fn mul(self, rhs: &E8s) -> Self::Output {
        (&self).mul(rhs)
    }
}

impl Mul<E8s> for &E8s {
    type Output = E8s;

    fn mul(self, rhs: E8s) -> Self::Output {
        self.mul(&rhs)
    }
}

impl MulAssign<&E8s> for E8s {
    fn mul_assign(&mut self, rhs: &E8s) {
        *(&mut self.0 .0) = (&self.0 .0).mul(&rhs.0 .0).div(E8s::one().0 .0)
    }
}

impl MulAssign for E8s {
    fn mul_assign(&mut self, rhs: Self) {
        self.mul_assign(&rhs)
    }
}

impl Div for &E8s {
    type Output = E8s;

    fn div(self, rhs: Self) -> Self::Output {
        E8s(Nat((&self.0 .0).mul(E8s::one().0 .0).div(&rhs.0 .0)))
    }
}

impl Div for E8s {
    type Output = E8s;

    fn div(self, rhs: Self) -> Self::Output {
        (&self).div(&rhs)
    }
}

impl Div<&E8s> for E8s {
    type Output = E8s;

    fn div(self, rhs: &E8s) -> Self::Output {
        (&self).div(rhs)
    }
}

impl Div<E8s> for &E8s {
    type Output = E8s;

    fn div(self, rhs: E8s) -> Self::Output {
        self.div(&rhs)
    }
}

impl DivAssign<&E8s> for E8s {
    fn div_assign(&mut self, rhs: &E8s) {
        *(&mut self.0 .0) = (&self.0 .0).mul(E8s::one().0 .0).div(&rhs.0 .0)
    }
}

impl DivAssign for E8s {
    fn div_assign(&mut self, rhs: Self) {
        self.div_assign(&rhs)
    }
}

impl Storable for E8s {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let mut buf = Vec::new();

        let balance_buf = self.0 .0.to_bytes_le();

        if balance_buf.len() > 32 {
            unreachable!("Can't encode numbers that big");
        }

        buf.push(balance_buf.len() as u8);
        buf.extend_from_slice(&balance_buf);

        return std::borrow::Cow::Owned(buf);
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        let balance_len = bytes[0] as usize;
        let mut balance_buf = vec![0u8; balance_len];
        balance_buf.copy_from_slice(&bytes[1..]);

        Self(Nat(BigUint::from_bytes_le(&balance_buf)))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 33, // 32 bytes balance, 1 byte balance len
        is_fixed_size: false,
    };
}
