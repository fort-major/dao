use std::{
    fmt::Display,
    ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Rem, Sub, SubAssign},
};

use candid::{CandidType, Nat};
use serde::Deserialize;

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Default, Hash)]
pub struct E8s(pub Nat);

impl E8s {
    pub fn zero() -> Self {
        Self(Nat::from(0u32))
    }

    pub fn one() -> Self {
        Self(Nat::from(1_0000_0000u64))
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
