/**
 * Copyright 2021 M.Vokhmentsev
 *
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable */

/**
 * @private
 * @internal
 */
export class QuadrupleBuilder {
  static parseDecimal(digits: number[], exp10: number): QuadrupleBuilder {
    let q = new QuadrupleBuilder();
    q.parse(digits, exp10);
    return q;
  }
  // The fields containing the value of the instance
  exponent: number = 0;
  mantHi: bigint = 0n;
  mantLo: bigint = 0n;
  // 2^192 = 6.277e57, so the 58-th digit after point may affect the result
  static MAX_MANTISSA_LENGTH = 59;
  // Max value of the decimal exponent, corresponds to EXPONENT_OF_MAX_VALUE
  static MAX_EXP10 = 646456993;
  // Min value of the decimal exponent, corresponds to EXPONENT_OF_MIN_NORMAL
  static MIN_EXP10 = -646457032;
  // (2^63) / 10 =~ 9.223372e17
  static TWO_POW_63_DIV_10 = 922337203685477580.0;
  // Just for convenience: 0x8000_0000_0000_0000L
  static HIGH_BIT = 0x8000_0000_0000_0000n;
  // Just for convenience: 0x8000_0000L, 2^31
  static POW_2_31 = 2147483648.0;
  // Just for convenience: 0x0000_0000_FFFF_FFFFL
  static LOWER_32_BITS = 0x0000_0000_ffff_ffffn;
  // Just for convenience: 0xFFFF_FFFF_0000_0000L;
  static HIGHER_32_BITS = 0xffff_ffff_0000_0000n;
  // Approximate value of log<sub>2</sub>(10)
  static LOG2_10 = Math.log(10) / Math.log(2);
  // Approximate value of log<sub>2</sub>(e)
  static LOG2_E = 1 / Math.log(2.0);
  // The value of the exponent (biased) corresponding to {@code 1.0 == 2^0}; equals to 2_147_483_647
  // ({@code 0x7FFF_FFFF}).
  static EXPONENT_BIAS = 0x7fff_ffff;
  // The value of the exponent (biased), corresponding to {@code Infinity}, {@code _Infinty}, and
  // {@code NaN}
  static EXPONENT_OF_INFINITY = 0xffff_ffffn;
  // An array of positive powers of two, each value consists of 4 longs: decimal exponent and 3 x 64
  // bits of mantissa, divided by ten Used to find an arbitrary power of 2 (by powerOfTwo(long exp))
  static POS_POWERS_OF_2: bigint[][] = [
    // 0: 2^0 =   1 = 0.1e1
    [
      1n,
      0x1999_9999_9999_9999n,
      0x9999_9999_9999_9999n,
      0x9999_9999_9999_999an
    ], // 1: 2^(2^0) =   2^1 =   2 = 0.2e1
    [
      1n,
      0x3333_3333_3333_3333n,
      0x3333_3333_3333_3333n,
      0x3333_3333_3333_3334n
    ], // ***
    // 2: 2^(2^1) =   2^2 =   4 = 0.4e1
    [
      1n,
      0x6666_6666_6666_6666n,
      0x6666_6666_6666_6666n,
      0x6666_6666_6666_6667n
    ], // ***
    // 3: 2^(2^2) =   2^4 =   16 = 0.16e2
    [
      2n,
      0x28f5_c28f_5c28_f5c2n,
      0x8f5c_28f5_c28f_5c28n,
      0xf5c2_8f5c_28f5_c290n
    ], // ***
    // 4: 2^(2^3) =   2^8 =   256 = 0.256e3
    [
      3n,
      0x4189_374b_c6a7_ef9dn,
      0xb22d_0e56_0418_9374n,
      0xbc6a_7ef9_db22_d0e6n
    ], // ***
    // 5: 2^(2^4) =   2^16 =   65536 = 0.65536e5
    [
      5n,
      0xa7c5_ac47_1b47_8423n,
      0x0fcf_80dc_3372_1d53n,
      0xcddd_6e04_c059_2104n
    ], // 6: 2^(2^5) =   2^32 =   4294967296 = 0.4294967296e10
    [
      10n,
      0x6df3_7f67_5ef6_eadfn,
      0x5ab9_a207_2d44_268dn,
      0x97df_837e_6748_956en
    ], // 7: 2^(2^6) =   2^64 =   18446744073709551616 = 0.18446744073709551616e20
    [
      20n,
      0x2f39_4219_2484_46ban,
      0xa23d_2ec7_29af_3d61n,
      0x0607_aa01_67dd_94cbn
    ], // 8: 2^(2^7) =   2^128 =   340282366920938463463374607431768211456 =
    // 0.340282366920938463463374607431768211456e39
    [
      39n,
      0x571c_bec5_54b6_0dbbn,
      0xd5f6_4baf_0506_840dn,
      0x451d_b70d_5904_029bn
    ], // 9: 2^(2^8) =   2^256 =
    // 1.1579208923731619542357098500868790785326998466564056403945758401E+77 =
    // 0.11579208923731619542357098500868790785326998466564056403945758401e78
    [
      78n,
      0x1da4_8ce4_68e7_c702n,
      0x6520_247d_3556_476dn,
      0x1469_caf6_db22_4cfan
    ], // ***
    // 10: 2^(2^9) =   2^512 =
    // 1.3407807929942597099574024998205846127479365820592393377723561444E+154 =
    // 0.13407807929942597099574024998205846127479365820592393377723561444e155
    [
      155n,
      0x2252_f0e5_b397_69dcn,
      0x9ae2_eea3_0ca3_ade0n,
      0xeeaa_3c08_dfe8_4e30n
    ], // 11: 2^(2^10) =   2^1024 =
    // 1.7976931348623159077293051907890247336179769789423065727343008116E+308 =
    // 0.17976931348623159077293051907890247336179769789423065727343008116e309
    [
      309n,
      0x2e05_5c9a_3f6b_a793n,
      0x1658_3a81_6eb6_0a59n,
      0x22c4_b082_6cf1_ebf7n
    ], // 12: 2^(2^11) =   2^2048 =
    // 3.2317006071311007300714876688669951960444102669715484032130345428E+616 =
    // 0.32317006071311007300714876688669951960444102669715484032130345428e617
    [
      617n,
      0x52bb_45e9_cf23_f17fn,
      0x7688_c076_06e5_0364n,
      0xb344_79aa_9d44_9a57n
    ], // 13: 2^(2^12) =   2^4096 =
    // 1.0443888814131525066917527107166243825799642490473837803842334833E+1233 =
    // 0.10443888814131525066917527107166243825799642490473837803842334833e1234
    [
      1234n,
      0x1abc_81c8_ff5f_846cn,
      0x8f5e_3c98_53e3_8c97n,
      0x4506_0097_f3bf_9296n
    ], // 14: 2^(2^13) =   2^8192 =
    // 1.0907481356194159294629842447337828624482641619962326924318327862E+2466 =
    // 0.10907481356194159294629842447337828624482641619962326924318327862e2467
    [
      2467n,
      0x1bec_53b5_10da_a7b4n,
      0x4836_9ed7_7dbb_0eb1n,
      0x3b05_587b_2187_b41en
    ], // 15: 2^(2^14) =   2^16384 =
    // 1.1897314953572317650857593266280071307634446870965102374726748212E+4932 =
    // 0.11897314953572317650857593266280071307634446870965102374726748212e4933
    [
      4933n,
      0x1e75_063a_5ba9_1326n,
      0x8abf_b8e4_6001_6ae3n,
      0x2800_8702_d29e_8a3cn
    ], // 16: 2^(2^15) =   2^32768 =
    // 1.4154610310449547890015530277449516013481307114723881672343857483E+9864 =
    // 0.14154610310449547890015530277449516013481307114723881672343857483e9865
    [
      9865n,
      0x243c_5d8b_b5c5_fa55n,
      0x40c6_d248_c588_1915n,
      0x4c0f_d99f_d5be_fc22n
    ], // 17: 2^(2^16) =   2^65536 =
    // 2.0035299304068464649790723515602557504478254755697514192650169737E+19728 =
    // 0.20035299304068464649790723515602557504478254755697514192650169737e19729
    [
      19729n,
      0x334a_5570_c3f4_ef3cn,
      0xa13c_36c4_3f97_9c90n,
      0xda7a_c473_555f_b7a8n
    ], // 18: 2^(2^17) =   2^131072 =
    // 4.0141321820360630391660606060388767343771510270414189955825538065E+39456 =
    // 0.40141321820360630391660606060388767343771510270414189955825538065e39457
    [
      39457n,
      0x66c3_0444_5dd9_8f3bn,
      0xa8c2_93a2_0e47_a41bn,
      0x4c5b_03dc_1260_4964n
    ], // 19: 2^(2^18) =   2^262144 =
    // 1.6113257174857604736195721184520050106440238745496695174763712505E+78913 =
    // 0.16113257174857604736195721184520050106440238745496695174763712505e78914
    [
      78914n,
      0x293f_fbf5_fb02_8cc4n,
      0x89d3_e5ff_4423_8406n,
      0x369a_339e_1bfe_8c9bn
    ], // 20: 2^(2^19) =   2^524288 =
    // 2.5963705678310007761265964957268828277447343763484560463573654868E+157826 =
    // 0.25963705678310007761265964957268828277447343763484560463573654868e157827
    [
      157827n,
      0x4277_92fb_b68e_5d20n,
      0x7b29_7cd9_fc15_4b62n,
      0xf091_4211_4aa9_a20cn
    ], // 21: 2^(2^20) =   2^1048576 =
    // 6.7411401254990734022690651047042454376201859485326882846944915676E+315652 =
    // 0.67411401254990734022690651047042454376201859485326882846944915676e315653
    [
      315653n,
      0xac92_bc65_ad5c_08fcn,
      0x00be_eb11_5a56_6c19n,
      0x4ba8_82d8_a462_2437n
    ], // 22: 2^(2^21) =   2^2097152 =
    // 4.5442970191613663099961595907970650433180103994591456270882095573E+631305 =
    // 0.45442970191613663099961595907970650433180103994591456270882095573e631306
    [
      631306n,
      0x7455_8144_0f92_e80en,
      0x4da8_22cf_7f89_6f41n,
      0x509d_5986_7816_4ecdn
    ], // 23: 2^(2^22) =   2^4194304 =
    // 2.0650635398358879243991194945816501695274360493029670347841664177E+1262611 =
    // 0.20650635398358879243991194945816501695274360493029670347841664177e1262612
    [
      1262612n,
      0x34dd_99b4_c695_23a5n,
      0x64bc_2e8f_0d8b_1044n,
      0xb03b_1c96_da5d_d349n
    ], // 24: 2^(2^23) =   2^8388608 =
    // 4.2644874235595278724327289260856157547554200794957122157246170406E+2525222 =
    // 0.42644874235595278724327289260856157547554200794957122157246170406e2525223
    [
      2525223n,
      0x6d2b_bea9_d6d2_5a08n,
      0xa0a4_606a_88e9_6b70n,
      0x1820_63bb_c2fe_8520n
    ], // 25: 2^(2^24) =   2^16777216 =
    // 1.8185852985697380078927713277749906189248596809789408311078112486E+5050445 =
    // 0.18185852985697380078927713277749906189248596809789408311078112486e5050446
    [
      5050446n,
      0x2e8e_47d6_3bfd_d6e3n,
      0x2b55_fa89_76ea_a3e9n,
      0x1a6b_9d30_8641_2a73n
    ], // 26: 2^(2^25) =   2^33554432 =
    // 3.3072524881739831340558051919726975471129152081195558970611353362E+10100890 =
    // 0.33072524881739831340558051919726975471129152081195558970611353362e10100891
    [
      10100891n,
      0x54aa_68ef_a1d7_19dfn,
      0xd850_5806_612c_5c8fn,
      0xad06_8837_fee8_b43an
    ], // 27: 2^(2^26) =   2^67108864 =
    // 1.0937919020533002449982468634925923461910249420785622990340704603E+20201781 =
    // 0.10937919020533002449982468634925923461910249420785622990340704603e20201782
    [
      20201782n,
      0x1c00_464c_cb7b_ae77n,
      0x9e38_7778_4c77_982cn,
      0xd94a_f3b6_1717_404fn
    ], // 28: 2^(2^27) =   2^134217728 =
    // 1.1963807249973763567102377630870670302911237824129274789063323723E+40403562 =
    // 0.11963807249973763567102377630870670302911237824129274789063323723e40403563
    [
      40403563n,
      0x1ea0_99c8_be2b_6cd0n,
      0x8bfb_6d53_9fa5_0466n,
      0x6d3b_c37e_69a8_4218n
    ], // 29: 2^(2^28) =   2^268435456 =
    // 1.4313268391452478724777126233530788980596273340675193575004129517E+80807124 =
    // 0.14313268391452478724777126233530788980596273340675193575004129517e80807125
    [
      80807125n,
      0x24a4_57f4_66ce_8d18n,
      0xf2c8_f3b8_1bc6_bb59n,
      0xa78c_7576_92e0_2d49n
    ], // 30: 2^(2^29) =   2^536870912 =
    // 2.0486965204575262773910959587280218683219330308711312100181276813E+161614248 =
    // 0.20486965204575262773910959587280218683219330308711312100181276813e161614249
    [
      161614249n,
      0x3472_5667_7aba_6b53n,
      0x3fbf_90d3_0611_a67cn,
      0x1e03_9d87_e0bd_b32bn
    ], // 31: 2^(2^30) =   2^1073741824 =
    // 4.1971574329347753848087162337676781412761959309467052555732924370E+323228496 =
    // 0.41971574329347753848087162337676781412761959309467052555732924370e323228497
    [
      323228497n,
      0x6b72_7daf_0fd3_432an,
      0x71f7_1121_f9e4_200fn,
      0x8fcd_9942_d486_c10cn
    ], // 32: 2^(2^31) =   2^2147483648 =
    // 1.7616130516839633532074931497918402856671115581881347960233679023E+646456993 =
    // 0.17616130516839633532074931497918402856671115581881347960233679023e646456994
    [
      646456994n,
      0x2d18_e844_84d9_1f78n,
      0x4079_bfe7_829d_ec6fn,
      0x2155_1643_e365_abc6n
    ]
  ];
  // An array of negative powers of two, each value consists of 4 longs: decimal exponent and 3 x 64
  // bits of mantissa, divided by ten. Used to find an arbitrary power of 2 (by powerOfTwo(long exp))
  static NEG_POWERS_OF_2: bigint[][] = [
    // v18
    // 0: 2^0 =   1 = 0.1e1
    [
      1n,
      0x1999_9999_9999_9999n,
      0x9999_9999_9999_9999n,
      0x9999_9999_9999_999an
    ], // 1: 2^-(2^0) =   2^-1 =   0.5 = 0.5e0
    [
      0n,
      0x8000_0000_0000_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0000n
    ], // 2: 2^-(2^1) =   2^-2 =   0.25 = 0.25e0
    //      {0, 0x4000_0000_0000_0000L, 0x0000_0000_0000_0000L, 0x0000_0000_0000_0000L},
    [
      0n,
      0x4000_0000_0000_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0001n
    ], // ***
    // 3: 2^-(2^2) =   2^-4 =   0.0625 = 0.625e-1
    [
      -1n,
      0xa000_0000_0000_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0000n
    ], // 4: 2^-(2^3) =   2^-8 =   0.00390625 = 0.390625e-2
    [
      -2n,
      0x6400_0000_0000_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0000n
    ], // 5: 2^-(2^4) =   2^-16 =   0.0000152587890625 = 0.152587890625e-4
    [
      -4n,
      0x2710_0000_0000_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0001n
    ], // ***
    // 6: 2^-(2^5) =   2^-32 =   2.3283064365386962890625E-10 = 0.23283064365386962890625e-9
    [
      -9n,
      0x3b9a_ca00_0000_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0001n
    ], // ***
    // 7: 2^-(2^6) =   2^-64 =   5.42101086242752217003726400434970855712890625E-20 =
    // 0.542101086242752217003726400434970855712890625e-19
    [
      -19n,
      0x8ac7_2304_89e8_0000n,
      0x0000_0000_0000_0000n,
      0x0000_0000_0000_0000n
    ], // 8: 2^-(2^7) =   2^-128 =
    // 2.9387358770557187699218413430556141945466638919302188037718792657E-39 =
    // 0.29387358770557187699218413430556141945466638919302188037718792657e-38
    [
      -38n,
      0x4b3b_4ca8_5a86_c47an,
      0x098a_2240_0000_0000n,
      0x0000_0000_0000_0001n
    ], // ***
    // 9: 2^-(2^8) =   2^-256 =
    // 8.6361685550944446253863518628003995711160003644362813850237034700E-78 =
    // 0.86361685550944446253863518628003995711160003644362813850237034700e-77
    [
      -77n,
      0xdd15_fe86_affa_d912n,
      0x49ef_0eb7_13f3_9eben,
      0xaa98_7b6e_6fd2_a002n
    ], // 10: 2^-(2^9) =   2^-512 =
    // 7.4583407312002067432909653154629338373764715346004068942715183331E-155 =
    // 0.74583407312002067432909653154629338373764715346004068942715183331e-154
    [
      -154n,
      0xbeee_fb58_4aff_8603n,
      0xaafb_550f_facf_d8fan,
      0x5ca4_7e4f_88d4_5371n
    ], // 11: 2^-(2^10) =   2^-1024 =
    // 5.5626846462680034577255817933310101605480399511558295763833185421E-309 =
    // 0.55626846462680034577255817933310101605480399511558295763833185421e-308
    [
      -308n,
      0x8e67_9c2f_5e44_ff8fn,
      0x570f_09ea_a7ea_7648n,
      0x5961_db50_c6d2_b888n
    ], // ***
    // 12: 2^-(2^11) =   2^-2048 =
    // 3.0943460473825782754801833699711978538925563038849690459540984582E-617 =
    // 0.30943460473825782754801833699711978538925563038849690459540984582e-616
    [
      -616n,
      0x4f37_1b33_99fc_2ab0n,
      0x8170_041c_9feb_05aan,
      0xc7c3_4344_7c75_bcf6n
    ], // 13: 2^-(2^12) =   2^-4096 =
    // 9.5749774609521853579467310122804202420597417413514981491308464986E-1234 =
    // 0.95749774609521853579467310122804202420597417413514981491308464986e-1233
    [
      -1233n,
      0xf51e_9281_7901_3fd3n,
      0xde4b_d12c_de4d_985cn,
      0x4a57_3ca6_f94b_ff14n
    ], // 14: 2^-(2^13) =   2^-8192 =
    // 9.1680193377742358281070619602424158297818248567928361864131947526E-2467 =
    // 0.91680193377742358281070619602424158297818248567928361864131947526e-2466
    [
      -2466n,
      0xeab3_8812_7bcc_aff7n,
      0x1667_6391_42b9_fbaen,
      0x775e_c999_5e10_39fbn
    ], // 15: 2^-(2^14) =   2^-16384 =
    // 8.4052578577802337656566945433043815064951983621161781002720680748E-4933 =
    // 0.84052578577802337656566945433043815064951983621161781002720680748e-4932
    [
      -4932n,
      0xd72c_b2a9_5c7e_f6ccn,
      0xe81b_f1e8_25ba_7515n,
      0xc2fe_b521_d6cb_5dcdn
    ], // 16: 2^-(2^15) =   2^-32768 =
    // 7.0648359655776364427774021878587184537374439102725065590941425796E-9865 =
    // 0.70648359655776364427774021878587184537374439102725065590941425796e-9864
    [
      -9864n,
      0xb4dc_1be6_6045_02dcn,
      0xd491_079b_8eef_6535n,
      0x578d_3965_d24d_e84dn
    ], // ***
    // 17: 2^-(2^16) =   2^-65536 =
    // 4.9911907220519294656590574792132451973746770423207674161425040336E-19729 =
    // 0.49911907220519294656590574792132451973746770423207674161425040336e-19728
    [
      -19728n,
      0x7fc6_447b_ee60_ea43n,
      0x2548_da5c_8b12_5b27n,
      0x5f42_d114_2f41_d349n
    ], // ***
    // 18: 2^-(2^17) =   2^-131072 =
    // 2.4911984823897261018394507280431349807329035271689521242878455599E-39457 =
    // 0.24911984823897261018394507280431349807329035271689521242878455599e-39456
    [
      -39456n,
      0x3fc6_5180_f88a_f8fbn,
      0x6a69_15f3_8334_9413n,
      0x063c_3708_b6ce_b291n
    ], // ***
    // 19: 2^-(2^18) =   2^-262144 =
    // 6.2060698786608744707483205572846793091942192651991171731773832448E-78914 =
    // 0.62060698786608744707483205572846793091942192651991171731773832448e-78913
    [
      -78913n,
      0x9ee0_197c_8dcd_55bfn,
      0x2b2b_9b94_2c38_f4a2n,
      0x0f8b_a634_e9c7_06aen
    ], // 20: 2^-(2^19) =   2^-524288 =
    // 3.8515303338821801176537443725392116267291403078581314096728076497E-157827 =
    // 0.38515303338821801176537443725392116267291403078581314096728076497e-157826
    [
      -157826n,
      0x6299_63a2_5b8b_2d79n,
      0xd00b_9d22_86f7_0876n,
      0xe970_0470_0c36_44fcn
    ], // ***
    // 21: 2^-(2^20) =   2^-1048576 =
    // 1.4834285912814577854404052243709225888043963245995136935174170977E-315653 =
    // 0.14834285912814577854404052243709225888043963245995136935174170977e-315652
    [
      -315652n,
      0x25f9_cc30_8cee_f4f3n,
      0x40f1_9543_911a_4546n,
      0xa2cd_3894_52cf_c366n
    ], // 22: 2^-(2^21) =   2^-2097152 =
    // 2.2005603854312903332428997579002102976620485709683755186430397089E-631306 =
    // 0.22005603854312903332428997579002102976620485709683755186430397089e-631305
    [
      -631305n,
      0x3855_97b0_d47e_76b8n,
      0x1b9f_67e1_03bf_2329n,
      0xc311_9848_5959_85f7n
    ], // 23: 2^-(2^22) =   2^-4194304 =
    // 4.8424660099295090687215589310713586524081268589231053824420510106E-1262612 =
    // 0.48424660099295090687215589310713586524081268589231053824420510106e-1262611
    [
      -1262611n,
      0x7bf7_95d2_76c1_2f66n,
      0x66a6_1d62_a446_659an,
      0xa1a4_d73b_ebf0_93d5n
    ], // ***
    // 24: 2^-(2^23) =   2^-8388608 =
    // 2.3449477057322620222546775527242476219043877555386221929831430440E-2525223 =
    // 0.23449477057322620222546775527242476219043877555386221929831430440e-2525222
    [
      -2525222n,
      0x3c07_d96a_b1ed_7799n,
      0xcb73_55c2_2cc0_5ac0n,
      0x4ffc_0ab7_3b1f_6a49n
    ], // ***
    // 25: 2^-(2^24) =   2^-16777216 =
    // 5.4987797426189993226257377747879918011694025935111951649826798628E-5050446 =
    // 0.54987797426189993226257377747879918011694025935111951649826798628e-5050445
    [
      -5050445n,
      0x8cc4_cd8c_3ede_fb9an,
      0x6c8f_f86a_90a9_7e0cn,
      0x166c_fddb_f98b_71bfn
    ], // ***
    // 26: 2^-(2^25) =   2^-33554432 =
    // 3.0236578657837068435515418409027857523343464783010706819696074665E-10100891 =
    // 0.30236578657837068435515418409027857523343464783010706819696074665e-10100890
    [
      -10100890n,
      0x4d67_d81c_c88e_1228n,
      0x1d7c_fb06_666b_79b3n,
      0x7b91_6728_aaa4_e70dn
    ], // ***
    // 27: 2^-(2^26) =   2^-67108864 =
    // 9.1425068893156809483320844568740945600482370635012633596231964471E-20201782 =
    // 0.91425068893156809483320844568740945600482370635012633596231964471e-20201781
    [
      -20201781n,
      0xea0c_5549_4e7a_552dn,
      0xb88c_b948_4bb8_6c61n,
      0x8d44_893c_610b_b7dfn
    ], // ***
    // 28: 2^-(2^27) =   2^-134217728 =
    // 8.3585432221184688810803924874542310018191301711943564624682743545E-40403563 =
    // 0.83585432221184688810803924874542310018191301711943564624682743545e-40403562
    [
      -40403562n,
      0xd5fa_8c82_1ec0_c24an,
      0xa80e_46e7_64e0_f8b0n,
      0xa727_6bfa_432f_ac7en
    ], // 29: 2^-(2^28) =   2^-268435456 =
    // 6.9865244796022595809958912202005005328020601847785697028605460277E-80807125 =
    // 0.69865244796022595809958912202005005328020601847785697028605460277e-80807124
    [
      -80807124n,
      0xb2da_e307_426f_6791n,
      0xc970_b82f_58b1_2918n,
      0x0472_592f_7f39_190en
    ], // 30: 2^-(2^29) =   2^-536870912 =
    // 4.8811524304081624052042871019605298977947353140996212667810837790E-161614249 =
    // 0.48811524304081624052042871019605298977947353140996212667810837790e-161614248
    //      {-161614248, 0x7cf5_1edd_8a15_f1c9L, 0x656d_ab34_98f8_e697L, 0x12da_a2a8_0e53_c809L},
    [
      -161614248n,
      0x7cf5_1edd_8a15_f1c9n,
      0x656d_ab34_98f8_e697n,
      0x12da_a2a8_0e53_c807n
    ], // 31: 2^-(2^30) =   2^-1073741824 =
    // 2.3825649048879510732161697817326745204151961255592397879550237608E-323228497 =
    // 0.23825649048879510732161697817326745204151961255592397879550237608e-323228496
    [
      -323228496n,
      0x3cfe_609a_b588_3c50n,
      0xbec8_b5d2_2b19_8871n,
      0xe184_7770_3b46_22b4n
    ], // 32: 2^-(2^31) =   2^-2147483648 =
    // 5.6766155260037313438164181629489689531186932477276639365773003794E-646456994 =
    // 0.56766155260037313438164181629489689531186932477276639365773003794e-646456993
    [
      -646456993n,
      0x9152_447b_9d7c_da9an,
      0x3b4d_3f61_10d7_7aadn,
      0xfa81_bad1_c394_adb4n
    ]
  ];
  // Buffers used internally
  // The order of words in the arrays is big-endian: the highest part is in buff[0] (in buff[1] for
  // buffers of 10 words)

  buffer4x64B: bigint[] = new Array(4).fill(0n);
  buffer6x32A: bigint[] = new Array(6).fill(0n);
  buffer6x32B: bigint[] = new Array(6).fill(0n);
  buffer6x32C: bigint[] = new Array(6).fill(0n);
  buffer12x32: bigint[] = new Array(12).fill(0n);
  parse(digits: number[], exp10: number): void {
    exp10 += digits.length - 1; // digits is viewed as x.yyy below.
    this.exponent = 0;
    this.mantHi = 0n;
    this.mantLo = 0n;
    // Finds numeric value of the decimal mantissa
    let mantissa: bigint[] = this.buffer6x32C;
    let exp10Corr: number = this.parseMantissa(digits, mantissa);
    if (exp10Corr == 0 && this.isEmpty(mantissa)) {
      // Mantissa == 0
      return;
    }
    // takes account of the point position in the mant string and possible carry as a result of
    // round-up (like 9.99e1 -> 1.0e2)
    exp10 += exp10Corr;
    if (exp10 < QuadrupleBuilder.MIN_EXP10) {
      return;
    }
    if (exp10 > QuadrupleBuilder.MAX_EXP10) {
      this.exponent = Number(QuadrupleBuilder.EXPONENT_OF_INFINITY);
      return;
    }
    let exp2: number = this.findBinaryExponent(exp10, mantissa);
    // Finds binary mantissa and possible exponent correction. Fills the fields.
    this.findBinaryMantissa(exp10, exp2, mantissa);
  }
  parseMantissa(digits: number[], mantissa: bigint[]): number {
    for (let i = 0; i < 6; i++) {
      mantissa[i] = 0n;
    }
    // Skip leading zeroes
    let firstDigit: number = 0;
    while (firstDigit < digits.length && digits[firstDigit] == 0) {
      firstDigit += 1;
    }
    if (firstDigit == digits.length) {
      return 0; // All zeroes
    }
    let expCorr: number = -firstDigit;
    // Limit the string length to avoid unnecessary fuss
    if (digits.length - firstDigit > QuadrupleBuilder.MAX_MANTISSA_LENGTH) {
      let carry: boolean = digits[QuadrupleBuilder.MAX_MANTISSA_LENGTH] >= 5; // The highest digit to be truncated
      let truncated: number[] = new Array(
        QuadrupleBuilder.MAX_MANTISSA_LENGTH
      ).fill(0);
      for (let i = 0; i < QuadrupleBuilder.MAX_MANTISSA_LENGTH; i++) {
        truncated[i] = digits[i + firstDigit];
      }
      if (carry) {
        // Round-up: add carry
        expCorr += this.addCarry(truncated); // May add an extra digit in front of it (99..99 -> 100)
      }
      digits = truncated;
      firstDigit = 0;
    }
    for (let i = digits.length - 1; i >= firstDigit; i--) {
      // digits, starting from the last
      mantissa[0] |= BigInt(digits[i]) << 32n;
      this.divBuffBy10(mantissa);
    }
    return expCorr;
  }
  // Divides the unpacked value stored in the given buffer by 10
  // @param buffer contains the unpacked value to divide (32 least significant bits are used)
  divBuffBy10(buffer: bigint[]): void {
    let maxIdx: number = buffer.length;
    // big/endian
    for (let i = 0; i < maxIdx; i++) {
      let r: bigint = buffer[i] % 10n;
      buffer[i] = buffer[i] / 10n;
      if (i + 1 < maxIdx) {
        buffer[i + 1] += r << 32n;
      }
    }
  }
  // Checks if the buffer is empty (contains nothing but zeros)
  // @param buffer the buffer to check
  // @return {@code true} if the buffer is empty, {@code false} otherwise
  isEmpty(buffer: bigint[]): boolean {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] != 0n) {
        return false;
      }
    }
    return true;
  }
  // Adds one to a decimal number represented as a sequence of decimal digits. propagates carry as
  // needed, so that {@code addCarryTo("6789") = "6790", addCarryTo("9999") = "10000"} etc.
  // @return 1 if an additional higher "1" was added in front of the number as a result of
  //     rounding-up, 0 otherwise
  addCarry(digits: number[]): number {
    for (let i = digits.length - 1; i >= 0; i--) {
      // starting with the lowest digit
      let c: number = digits[i];
      if (c == 9) {
        digits[i] = 0;
      } else {
        digits[i] = digits[i] + 1;
        return 0;
      }
    }
    digits[0] = 1;
    return 1;
  }
  // Finds binary exponent, using decimal exponent and mantissa.<br>
  // exp2 = exp10 * log<sub>2</sub>(10) + log<sub>2</sub>(mant)<br>
  // @param exp10 decimal exponent
  // @param mantissa array of longs containing decimal mantissa (divided by 10)
  // @return found value of binary exponent
  findBinaryExponent(exp10: number, mantissa: bigint[]): number {
    let mant10: bigint = (mantissa[0] << 31n) | (mantissa[1] >> 1n); // Higher 63 bits of the mantissa, in range
    // 0x0CC..CCC -- 0x7FF..FFF (2^63/10 -- 2^63-1)
    // decimal value of the mantissa in range 1.0..9.9999...
    let mant10d: number = Number(mant10) / QuadrupleBuilder.TWO_POW_63_DIV_10;
    return Math.floor(
      Number(exp10) * QuadrupleBuilder.LOG2_10 + this.log2(mant10d)
    ); // Binary exponent
  }
  // Calculates log<sub>2</sub> of the given x
  // @param x argument that can't be 0
  // @return the value of log<sub>2</sub>(x)
  log2(x: number): number {
    // x can't be 0
    return QuadrupleBuilder.LOG2_E * Math.log(x);
  }
  findBinaryMantissa(exp10: number, exp2: number, mantissa: bigint[]): void {
    // pow(2, -exp2): division by 2^exp2 is multiplication by 2^(-exp2) actually
    let powerOf2: bigint[] = this.buffer4x64B;
    this.powerOfTwo(-exp2, powerOf2);
    let product: bigint[] = this.buffer12x32; // use it for the product (M * 10^E / 2^e)
    this.multUnpacked6x32byPacked(mantissa, powerOf2, product); // product in buff_12x32
    this.multBuffBy10(product); // "Quasidecimals" are numbers divided by 10
    // The powerOf2[0] is stored as an unsigned value
    if (BigInt(powerOf2[0]) != BigInt(-exp10)) {
      // For some combinations of exp2 and exp10, additional multiplication needed
      // (see mant2_from_M_E_e.xls)
      this.multBuffBy10(product);
    }
    // compensate possible inaccuracy of logarithms used to compute exp2
    exp2 += this.normalizeMant(product);
    exp2 += QuadrupleBuilder.EXPONENT_BIAS; // add bias
    // For subnormal values, exp2 <= 0. We just return 0 for them, as they are
    // far from any range we are interested in.
    if (exp2 <= 0) {
      return;
    }
    exp2 += this.roundUp(product); // round up, may require exponent correction
    if (BigInt(exp2) >= QuadrupleBuilder.EXPONENT_OF_INFINITY) {
      this.exponent = Number(QuadrupleBuilder.EXPONENT_OF_INFINITY);
    } else {
      this.exponent = Number(exp2);
      this.mantHi = ((product[0] << 32n) + product[1]) & 0xffffffffffffffffn;
      this.mantLo = ((product[2] << 32n) + product[3]) & 0xffffffffffffffffn;
    }
  }
  // Calculates the required power and returns the result in the quasidecimal format (an array of
  // longs, where result[0] is the decimal exponent of the resulting value, and result[1] --
  // result[3] contain 192 bits of the mantissa divided by ten (so that 8 looks like
  // <pre>{@code {1, 0xCCCC_.._CCCCL, 0xCCCC_.._CCCCL, 0xCCCC_.._CCCDL}}}</pre>
  // uses arrays <b><i>buffer4x64B</b>, buffer6x32A, buffer6x32B, buffer12x32</i></b>,
  // @param exp the power to raise 2 to
  // @param power (result) the value of {@code2^exp}
  powerOfTwo(exp: number, power: bigint[]): void {
    if (exp == 0) {
      this.array_copy(QuadrupleBuilder.POS_POWERS_OF_2[0], power);
      return;
    }
    // positive powers of 2 (2^0, 2^1, 2^2, 2^4, 2^8 ... 2^(2^31) )
    let powers: bigint[][] = QuadrupleBuilder.POS_POWERS_OF_2;
    if (exp < 0) {
      exp = -exp;
      powers = QuadrupleBuilder.NEG_POWERS_OF_2; // positive powers of 2 (2^0, 2^-1, 2^-2, 2^-4, 2^-8 ... 2^30)
    }
    // 2^31 = 0x8000_0000L; a single bit that will be shifted right at every iteration
    let currPowOf2: number = QuadrupleBuilder.POW_2_31;
    let idx: number = 32; // Index in the table of powers
    let first_power: boolean = true;
    // if exp = b31 * 2^31 + b30 * 2^30 + .. + b0 * 2^0, where b0..b31 are the values of the bits in
    // exp, then 2^exp = 2^b31 * 2^b30 ... * 2^b0. Find the product, using a table of powers of 2.
    while (exp > 0) {
      if (exp >= currPowOf2) {
        // the current bit in the exponent is 1
        if (first_power) {
          // 4 longs, power[0] -- decimal (?) exponent, power[1..3] -- 192 bits of mantissa
          this.array_copy(powers[idx], power);
          first_power = false;
        } else {
          // Multiply by the corresponding power of 2
          this.multPacked3x64_AndAdjustExponent(power, powers[idx], power);
        }
        exp -= currPowOf2;
      }
      idx -= 1;
      currPowOf2 = currPowOf2 * 0.5; // Note: this is exact
    }
  }
  // Copies from into to.
  array_copy(source: bigint[], dest: bigint[]): void {
    for (let i = 0; i < dest.length; i++) {
      dest[i] = source[i];
    }
  }
  // Multiplies two quasidecimal numbers contained in buffers of 3 x 64 bits with exponents, puts
  // the product to <b><i>buffer4x64B</i></b><br>
  // and returns it. Both each of the buffers and the product contain 4 longs - exponent and 3 x 64
  // bits of mantissa. If the higher word of mantissa of the product is less than
  // 0x1999_9999_9999_9999L (i.e. mantissa is less than 0.1) multiplies mantissa by 10 and adjusts
  // the exponent respectively.
  multPacked3x64_AndAdjustExponent(
    factor1: bigint[],
    factor2: bigint[],
    result: bigint[]
  ): void {
    this.multPacked3x64_simply(factor1, factor2, this.buffer12x32);
    let expCorr: number = this.correctPossibleUnderflow(this.buffer12x32);
    this.pack_6x32_to_3x64(this.buffer12x32, result);
    // result[0] is a signed int64 value stored in an uint64
    result[0] = factor1[0] + factor2[0] + BigInt(expCorr); // product.exp = f1.exp + f2.exp
  }
  // Multiplies mantissas of two packed quasidecimal values (each is an array of 4 longs, exponent +
  // 3 x 64 bits of mantissa) Returns the product as unpacked buffer of 12 x 32 (12 x 32 bits of
  // product)
  // uses arrays <b><i>buffer6x32A, buffer6x32B</b></i>
  // @param factor1 an array of longs containing factor 1 as packed quasidecimal
  // @param factor2 an array of longs containing factor 2 as packed quasidecimal
  // @param result an array of 12 longs filled with the product of mantissas
  multPacked3x64_simply(
    factor1: bigint[],
    factor2: bigint[],
    result: bigint[]
  ): void {
    for (let i = 0; i < result.length; i++) {
      result[i] = 0n;
    }
    // TODO2 19.01.16 21:23:06 for the next version -- rebuild the table of powers to make the
    // numbers unpacked, to avoid packing/unpacking
    this.unpack_3x64_to_6x32(factor1, this.buffer6x32A);
    this.unpack_3x64_to_6x32(factor2, this.buffer6x32B);
    for (let i = 6 - 1; i >= 0; i--) {
      // compute partial 32-bit products
      for (let j = 6 - 1; j >= 0; j--) {
        let part: bigint = this.buffer6x32A[i] * this.buffer6x32B[j];
        result[j + i + 1] =
          (result[j + i + 1] + (part & QuadrupleBuilder.LOWER_32_BITS)) &
          0xffffffffffffffffn;
        result[j + i] = (result[j + i] + (part >> 32n)) & 0xffffffffffffffffn;
      }
    }
    // Carry higher bits of the product to the lower bits of the next word
    for (let i = 12 - 1; i >= 1; i--) {
      result[i - 1] =
        (result[i - 1] + (result[i] >> 32n)) & 0xffffffffffffffffn;
      result[i] &= QuadrupleBuilder.LOWER_32_BITS;
    }
  }
  // Corrects possible underflow of the decimal mantissa, passed in in the {@code mantissa}, by
  // multiplying it by a power of ten. The corresponding value to adjust the decimal exponent is
  // returned as the result
  // @param mantissa a buffer containing the mantissa to be corrected
  // @return a corrective (addition) that is needed to adjust the decimal exponent of the number
  correctPossibleUnderflow(mantissa: bigint[]): number {
    let expCorr: number = 0;
    while (this.isLessThanOne(mantissa)) {
      // Underflow
      this.multBuffBy10(mantissa);
      expCorr -= 1;
    }
    return expCorr;
  }
  // Checks if the unpacked quasidecimal value held in the given buffer is less than one (in this
  // format, one is represented as { 0x1999_9999L, 0x9999_9999L, 0x9999_9999L,...}
  // @param buffer a buffer containing the value to check
  // @return {@code true}, if the value is less than one
  isLessThanOne(buffer: bigint[]): boolean {
    if (buffer[0] < 0x1999_9999n) {
      return true;
    }
    if (buffer[0] > 0x1999_9999n) {
      return false;
    }
    // A note regarding the coverage:
    // Multiplying a 128-bit number by another 192-bit number,
    // as well as multiplying of two 192-bit numbers,
    // can never produce 320 (or 384 bits, respectively) of 0x1999_9999L, 0x9999_9999L,
    for (let i = 1; i < buffer.length; i++) {
      // so this loop can't be covered entirely
      if (buffer[i] < 0x9999_9999n) {
        return true;
      }
      if (buffer[i] > 0x9999_9999n) {
        return false;
      }
    }
    // and it can never reach this point in real life.
    return false; // Still Java requires the return statement here.
  }
  // Multiplies unpacked 192-bit value by a packed 192-bit factor <br>
  // uses static arrays <b><i>buffer6x32B</i></b>
  // @param factor1 a buffer containing unpacked quasidecimal mantissa (6 x 32 bits)
  // @param factor2 an array of 4 longs containing packed quasidecimal power of two
  // @param product a buffer of at least 12 longs to hold the product
  multUnpacked6x32byPacked(
    factor1: bigint[],
    factor2: bigint[],
    product: bigint[]
  ): void {
    for (let i = 0; i < product.length; i++) {
      product[i] = 0n;
    }
    let unpacked2: bigint[] = this.buffer6x32B;
    this.unpack_3x64_to_6x32(factor2, unpacked2); // It's the powerOf2, with exponent in 0'th word
    let maxFactIdx: number = factor1.length;
    for (let i = maxFactIdx - 1; i >= 0; i--) {
      // compute partial 32-bit products
      for (let j = maxFactIdx - 1; j >= 0; j--) {
        let part: bigint = factor1[i] * unpacked2[j];
        product[j + i + 1] =
          (product[j + i + 1] + (part & QuadrupleBuilder.LOWER_32_BITS)) &
          0xffffffffffffffffn;
        product[j + i] = (product[j + i] + (part >> 32n)) & 0xffffffffffffffffn;
      }
    }
    // Carry higher bits of the product to the lower bits of the next word
    for (let i = 12 - 1; i >= 1; i--) {
      product[i - 1] =
        (product[i - 1] + (product[i] >> 32n)) & 0xffffffffffffffffn;
      product[i] &= QuadrupleBuilder.LOWER_32_BITS;
    }
  }
  // Multiplies the unpacked value stored in the given buffer by 10
  // @param buffer contains the unpacked value to multiply (32 least significant bits are used)
  multBuffBy10(buffer: bigint[]): void {
    let maxIdx: number = buffer.length - 1;
    buffer[0] &= QuadrupleBuilder.LOWER_32_BITS;
    buffer[maxIdx] *= 10n;
    for (let i = maxIdx - 1; i >= 0; i--) {
      buffer[i] =
        (buffer[i] * 10n + (buffer[i + 1] >> 32n)) & 0xffffffffffffffffn;
      buffer[i + 1] &= QuadrupleBuilder.LOWER_32_BITS;
    }
  }
  // Makes sure that the (unpacked) mantissa is normalized,
  // i.e. buff[0] contains 1 in bit 32 (the implied integer part) and higher 32 of mantissa in bits 31..0,
  // and buff[1]..buff[4] contain other 96 bits of mantissa in their lower halves:
  // <pre>0x0000_0001_XXXX_XXXXL, 0x0000_0000_XXXX_XXXXL...</pre>
  // If necessary, divides the mantissa by appropriate power of 2 to make it normal.
  // @param mantissa a buffer containing unpacked mantissa
  // @return if the mantissa was not normal initially, a correction that should be added to the result's exponent, or 0 otherwise
  normalizeMant(mantissa: bigint[]): number {
    let expCorr: number = 31 - QuadrupleBuilder.clz64(mantissa[0]);
    if (expCorr != 0) {
      this.divBuffByPower2(mantissa, expCorr);
    }
    return expCorr;
  }
  // Rounds up the contents of the unpacked buffer to 128 bits by adding unity one bit lower than
  // the lowest of these 128 bits. If carry propagates up to bit 33 of buff[0], shifts the buffer
  // rightwards to keep it normalized.
  // @param mantissa the buffer to get rounded
  // @return 1 if the buffer was shifted, 0 otherwise
  roundUp(mantissa: bigint[]): number {
    // due to the limited precision of the power of 2, a number with exactly half LSB in its
    // mantissa
    // (i.e that would have 0x8000_0000_0000_0000L in bits 128..191 if it were computed precisely),
    // after multiplication by this power of 2, may get erroneous bits 185..191 (counting from the
    // MSB),
    // taking a value from
    // 0xXXXX_XXXX_XXXX_XXXXL 0xXXXX_XXXX_XXXX_XXXXL 0x7FFF_FFFF_FFFF_FFD8L.
    // to
    // 0xXXXX_XXXX_XXXX_XXXXL 0xXXXX_XXXX_XXXX_XXXXL 0x8000_0000_0000_0014L, or something alike.
    // To round it up, we first add
    // 0x0000_0000_0000_0000L 0x0000_0000_0000_0000L 0x0000_0000_0000_0028L, to turn it into
    // 0xXXXX_XXXX_XXXX_XXXXL 0xXXXX_XXXX_XXXX_XXXXL 0x8000_0000_0000_00XXL,
    // and then add
    // 0x0000_0000_0000_0000L 0x0000_0000_0000_0000L 0x8000_0000_0000_0000L, to provide carry to
    // higher bits.
    this.addToBuff(mantissa, 5, 100n); // to compensate possible inaccuracy
    this.addToBuff(mantissa, 4, 0x8000_0000n); // round-up, if bits 128..159 >= 0x8000_0000L
    if ((mantissa[0] & (QuadrupleBuilder.HIGHER_32_BITS << 1n)) != 0n) {
      // carry's got propagated beyond the highest bit
      this.divBuffByPower2(mantissa, 1);
      return 1;
    }
    return 0;
  }
  // converts 192 most significant bits of the mantissa of a number from an unpacked quasidecimal
  // form (where 32 least significant bits only used) to a packed quasidecimal form (where buff[0]
  // contains the exponent and buff[1]..buff[3] contain 3 x 64 = 192 bits of mantissa)
  // @param unpackedMant a buffer of at least 6 longs containing an unpacked value
  // @param result a buffer of at least 4 long to hold the packed value
  // @return packedQD192 with words 1..3 filled with the packed mantissa. packedQD192[0] is not
  //     affected.
  pack_6x32_to_3x64(unpackedMant: bigint[], result: bigint[]): void {
    result[1] = (unpackedMant[0] << 32n) + unpackedMant[1];
    result[2] = (unpackedMant[2] << 32n) + unpackedMant[3];
    result[3] = (unpackedMant[4] << 32n) + unpackedMant[5];
  }
  // Unpacks the mantissa of a 192-bit quasidecimal (4 longs: exp10, mantHi, mantMid, mantLo) to a
  // buffer of 6 longs, where the least significant 32 bits of each long contains respective 32 bits
  // of the mantissa
  // @param qd192 array of 4 longs containing the number to unpack
  // @param buff_6x32 buffer of 6 long to hold the unpacked mantissa
  unpack_3x64_to_6x32(qd192: bigint[], buff_6x32: bigint[]): void {
    buff_6x32[0] = qd192[1] >> 32n;
    buff_6x32[1] = qd192[1] & QuadrupleBuilder.LOWER_32_BITS;
    buff_6x32[2] = qd192[2] >> 32n;
    buff_6x32[3] = qd192[2] & QuadrupleBuilder.LOWER_32_BITS;
    buff_6x32[4] = qd192[3] >> 32n;
    buff_6x32[5] = qd192[3] & QuadrupleBuilder.LOWER_32_BITS;
  }
  // Divides the contents of the buffer by 2^exp2<br>
  // (shifts the buffer rightwards by exp2 if the exp2 is positive, and leftwards if it's negative),
  // keeping it unpacked (only lower 32 bits of each element are used, except the buff[0] whose
  // higher half is intended to contain integer part)
  // @param buffer the buffer to divide
  // @param exp2 the exponent of the power of two to divide by, expected to be
  divBuffByPower2(buffer: bigint[], exp2: number): void {
    let maxIdx: number = buffer.length - 1;
    let backShift: bigint = BigInt(32 - Math.abs(exp2));
    if (exp2 > 0) {
      // Shift to the right
      let exp2Shift: bigint = BigInt(exp2);
      for (let i = maxIdx + 1 - 1; i >= 1; i--) {
        buffer[i] =
          (buffer[i] >> exp2Shift) |
          ((buffer[i - 1] << backShift) & QuadrupleBuilder.LOWER_32_BITS);
      }
      buffer[0] = buffer[0] >> exp2Shift; // Preserve the high half of buff[0]
    } else if (exp2 < 0) {
      // Shift to the left
      let exp2Shift: bigint = BigInt(-exp2);
      buffer[0] =
        ((buffer[0] << exp2Shift) | (buffer[1] >> backShift)) &
        0xffffffffffffffffn; // Preserve the high half of buff[0]
      for (let i = 1; i < maxIdx; i++) {
        buffer[i] =
          (((buffer[i] << exp2Shift) & QuadrupleBuilder.LOWER_32_BITS) |
            (buffer[i + 1] >> backShift)) &
          0xffffffffffffffffn;
      }
      buffer[maxIdx] =
        (buffer[maxIdx] << exp2Shift) & QuadrupleBuilder.LOWER_32_BITS;
    }
  }
  // Adds the summand to the idx'th word of the unpacked value stored in the buffer
  // and propagates carry as necessary
  // @param buff the buffer to add the summand to
  // @param idx  the index of the element to which the summand is to be added
  // @param summand the summand to add to the idx'th element of the buffer
  addToBuff(buff: bigint[], idx: number, summand: bigint): void {
    let maxIdx: number = idx;
    buff[maxIdx] = (buff[maxIdx] + summand) & 0xffffffffffffffffn; // Big-endian, the lowest word
    for (let i = maxIdx + 1 - 1; i >= 1; i--) {
      // from the lowest word upwards, except the highest
      if ((buff[i] & QuadrupleBuilder.HIGHER_32_BITS) != 0n) {
        buff[i] &= QuadrupleBuilder.LOWER_32_BITS;
        buff[i - 1] += 1n;
      } else {
        break;
      }
    }
  }
  static clz64(x: bigint): number {
    let high = Number(x >> 32n);
    return high == 0
      ? 32 + Math.clz32(Number(BigInt.asUintN(32, x)))
      : Math.clz32(high);
  }
}
