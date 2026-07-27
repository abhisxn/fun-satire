export type FigmaAssetRole = "eye" | "subject" | "control-icon" | "reference";

export type FigmaAssetEntry = Readonly<{
  id: string;
  role: FigmaAssetRole;
  nodeId: string;
  sourceHash: string;
  sha256: string;
  url: string;
  width: number;
  height: number;
  requiredFor: readonly string[];
}>;

export const FIGMA_ASSETS = Object.freeze([
  {
    "id": "eye-medium-01",
    "role": "eye",
    "nodeId": "18:115",
    "sourceHash": "9991c6dbe685daa34d4054efca6024f54a6f0c56",
    "sha256": "b463b982c0e8071657958f26220e54743e3fab7e55d002beb4437c22d518710e",
    "url": "/assets/figma/eyes/eye-medium-01.svg",
    "width": 180,
    "height": 92,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-medium-02",
    "role": "eye",
    "nodeId": "18:119",
    "sourceHash": "be7e2683c279305b6bd3bddf2033b31977c2b8da",
    "sha256": "a761cf6f8a26c9d59ead5e83597f9712b38017de9e780cc98451a8f6fdc991c1",
    "url": "/assets/figma/eyes/eye-medium-02.svg",
    "width": 208.766,
    "height": 106.703,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-medium-03",
    "role": "eye",
    "nodeId": "18:123",
    "sourceHash": "015e64fd8d9f94e59a9e4c3bee96fd2da8d47e08",
    "sha256": "e0cb5ce305fe849573356d0809ca9392d4bb2e43386a60ecac28b7da68a2fa7b",
    "url": "/assets/figma/eyes/eye-medium-03.svg",
    "width": 180,
    "height": 92,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-medium-04",
    "role": "eye",
    "nodeId": "18:127",
    "sourceHash": "bafd916932299932bd5af9e0bce67afdcf461125",
    "sha256": "62d4d5e031ae4c9271948b163b8c3c6cb8fb3b6e781b7706ce8224956ae6bb65",
    "url": "/assets/figma/eyes/eye-medium-04.svg",
    "width": 180,
    "height": 92,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-medium-05",
    "role": "eye",
    "nodeId": "18:131",
    "sourceHash": "2d4715f15d25ecaa96966c2a87dd8afdd9317c4f",
    "sha256": "b4d3ba9aeb30fd728bf45ec7094a5c271edc61dc807ee16b535a203daf0c2ade",
    "url": "/assets/figma/eyes/eye-medium-05.svg",
    "width": 180,
    "height": 92,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-medium-06",
    "role": "eye",
    "nodeId": "18:135",
    "sourceHash": "5d75982c9e3ed410896cf75d96f0d7abee8698ad",
    "sha256": "95542e3b4708dc6273bdb613d72d56c0b313c2ddde752cece1eb40f767d6dc03",
    "url": "/assets/figma/eyes/eye-medium-06.svg",
    "width": 180,
    "height": 92,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-01",
    "role": "eye",
    "nodeId": "18:139",
    "sourceHash": "e514b1099167e5455219ba491d85baacb97c1206",
    "sha256": "8144a0c508cf532f9fa21090bf66415e11d5ba020cea4723c8a99574a1a16298",
    "url": "/assets/figma/eyes/eye-large-01.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-02",
    "role": "eye",
    "nodeId": "18:143",
    "sourceHash": "71cfd4a2fe119f67b72986b1ae0b8f39fd7863f1",
    "sha256": "394bc92e27e865b160b5b2ef2334c475bfd491314682b7b8e73fcf6a18925843",
    "url": "/assets/figma/eyes/eye-large-02.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-03",
    "role": "eye",
    "nodeId": "18:147",
    "sourceHash": "82fca0f89c38c75cf0b4654cf8c5af0e585a7331",
    "sha256": "cff8bd33f316891d6ee44e6be4874de47ddd424273375f4104fa5fcf29af67f7",
    "url": "/assets/figma/eyes/eye-large-03.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-04",
    "role": "eye",
    "nodeId": "18:151",
    "sourceHash": "21e0709144e1d177e8cd5be2df233101de334df7",
    "sha256": "ee80a07b4b98a44661caecddaa503d628a6f7891eb96412be722ec1820f6d834",
    "url": "/assets/figma/eyes/eye-large-04.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-05",
    "role": "eye",
    "nodeId": "18:155",
    "sourceHash": "11e23f1099c19bd15b0e426b0a94f3c1a83f3275",
    "sha256": "ae55267cea6405c930b26edca4fc7f11ce668a03e84b05d0184c9ca3fde3454e",
    "url": "/assets/figma/eyes/eye-large-05.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-06",
    "role": "eye",
    "nodeId": "18:159",
    "sourceHash": "05cf6d9bfebb6c882b97352de8db7261c307d30e",
    "sha256": "ef91b9b862267180c078599fa9b4b519b5129d4e559b3b31d2d602bee142d5f1",
    "url": "/assets/figma/eyes/eye-large-06.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-07",
    "role": "eye",
    "nodeId": "18:163",
    "sourceHash": "9b203912b597687c5a76f7387e268d26139c0f84",
    "sha256": "e3ae6db187b82d63967d5385c7520a02210e8ac1928c82902470eb36034bf6f4",
    "url": "/assets/figma/eyes/eye-large-07.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-giant-01",
    "role": "eye",
    "nodeId": "18:167",
    "sourceHash": "d489d9f77952f50f107efa67f9ca11d0975a9d5d",
    "sha256": "214781b1c57c1b8633ff977e3ed6379eaa339037cd3ee51011187175e0a50b1c",
    "url": "/assets/figma/eyes/eye-giant-01.svg",
    "width": 320.293,
    "height": 163.705,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-giant-02",
    "role": "eye",
    "nodeId": "18:171",
    "sourceHash": "c18e1babf187c4eff399343439d5d79b7a2efd53",
    "sha256": "20652c42849a4cd44155ea8d3ebabaee8447649c97c9c9b42211af107c69decb",
    "url": "/assets/figma/eyes/eye-giant-02.svg",
    "width": 320.293,
    "height": 163.705,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-giant-03",
    "role": "eye",
    "nodeId": "18:175",
    "sourceHash": "d4d8f4e166abf066da9132bfd4dfc57b37f186e5",
    "sha256": "62842e932a6818cd7bc6517852b9a90dd9fe96be3398aca087aae6f678b8f996",
    "url": "/assets/figma/eyes/eye-giant-03.svg",
    "width": 320.293,
    "height": 163.705,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-giant-04",
    "role": "eye",
    "nodeId": "18:179",
    "sourceHash": "c3f2a9de9cc52dc6b140e9310efbd1bc687abbee",
    "sha256": "6667b2898c7865e1367b60a1271836c30d115c92e7bf773d2d34c1d6dc17a1a9",
    "url": "/assets/figma/eyes/eye-giant-04.svg",
    "width": 320.293,
    "height": 163.705,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-large-08",
    "role": "eye",
    "nodeId": "18:183",
    "sourceHash": "938259a2f138f8286134a78496ac0b97f0bef50a",
    "sha256": "6d368e31c44219df9919c444bef5175a33e5cd8cac1de654347a57e525bf7b09",
    "url": "/assets/figma/eyes/eye-large-08.svg",
    "width": 234.783,
    "height": 120,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-small-01",
    "role": "eye",
    "nodeId": "18:187",
    "sourceHash": "ff70c7571d5532337a02fd5fdd5116985d62971d",
    "sha256": "36c9740092ac7d08be3bfe8b8e808a63b4b720c986b5efa9c33b13822a3a201a",
    "url": "/assets/figma/eyes/eye-small-01.svg",
    "width": 148,
    "height": 75.6444,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-small-02",
    "role": "eye",
    "nodeId": "18:191",
    "sourceHash": "0c52ff9bf302691c9d8fe73c3db47de053adf552",
    "sha256": "fafa52d38f6773e8ddca999cbe686d5a0a435dc9a7fb4fc4b73e04443408d5af",
    "url": "/assets/figma/eyes/eye-small-02.svg",
    "width": 148,
    "height": 75.6444,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-small-03",
    "role": "eye",
    "nodeId": "18:195",
    "sourceHash": "bbe738f8f1e65e6823699ecfb94275f5e7fc4b0b",
    "sha256": "181a3d19e3a0582491c9da158887ee73efda30dbbfde017c079f17bc663b3112",
    "url": "/assets/figma/eyes/eye-small-03.svg",
    "width": 148,
    "height": 75.6444,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-small-04",
    "role": "eye",
    "nodeId": "18:199",
    "sourceHash": "fbb7cefd29fc25938e33ec6b77f0d39215657eb8",
    "sha256": "0948887260003ded69919937134eef00e2777167c3fb13e4b15f6aa94253dc04",
    "url": "/assets/figma/eyes/eye-small-04.svg",
    "width": 148,
    "height": 75.6444,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-small-05",
    "role": "eye",
    "nodeId": "18:203",
    "sourceHash": "4d94cafd924a104b07da4dab2522861ceffb9ffd",
    "sha256": "cdb1879263a947eceb2a265522c0d8effab5bb627c44872ea2b6d51c911d72a0",
    "url": "/assets/figma/eyes/eye-small-05.svg",
    "width": 148,
    "height": 75.6444,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-01",
    "role": "eye",
    "nodeId": "18:207",
    "sourceHash": "6b5884fa49a91a4a3213caeb3bbeba2815a43c82",
    "sha256": "bd142b0b0d5d3ef3085ea56139542c6a43fa9e3951b94cb1e41162b4286e6367",
    "url": "/assets/figma/eyes/eye-compact-01.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-02",
    "role": "eye",
    "nodeId": "18:211",
    "sourceHash": "83f9460d22b34d6a44d6f5a24e83429b39b3912b",
    "sha256": "d8c1e0f22ce86efdef266c9ab7cd6786a7a59a288f9b592f3948c1dfe9ca3754",
    "url": "/assets/figma/eyes/eye-compact-02.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113"
    ]
  },
  {
    "id": "eye-compact-02-attack",
    "role": "eye",
    "nodeId": "109:3767",
    "sourceHash": "c9257da6bb1cbceb6428346621286a8ba41b4d9a",
    "sha256": "1cf883dc278b918816fb68474b3ae96e0a10b5ddf1d9a0c43631b268bc2d4716",
    "url": "/assets/figma/eyes/eye-compact-02-attack.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-03",
    "role": "eye",
    "nodeId": "18:214",
    "sourceHash": "a7c0018da5eba670de8eae02cec47b7f24c45de9",
    "sha256": "8807620847686a814b4b0ce0a16b965d8328db7644fca6d900d35270d3f208ac",
    "url": "/assets/figma/eyes/eye-compact-03.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-04",
    "role": "eye",
    "nodeId": "18:218",
    "sourceHash": "fe3f335d0a99d7ab52d30b19c07606422f81b016",
    "sha256": "b26e83dc00449f6419a45f308ca934601eb3f7d3cbd0443ebeaf610c464d2fb3",
    "url": "/assets/figma/eyes/eye-compact-04.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-05",
    "role": "eye",
    "nodeId": "18:222",
    "sourceHash": "0cf32dbfc5ca5585bda4b9387e024f07dd177c35",
    "sha256": "22407978f7e42e99e58eca04d3e6003768c042fa3cb3aef635eb23ea79d4248a",
    "url": "/assets/figma/eyes/eye-compact-05.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-06",
    "role": "eye",
    "nodeId": "18:226",
    "sourceHash": "42258226c2eb96506dc1db63aafe3be4a93677c7",
    "sha256": "790b3ee381495cddfd4af771bcf14a5bae9c5bf639c1d761d8477e4d398a5d9d",
    "url": "/assets/figma/eyes/eye-compact-06.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-07",
    "role": "eye",
    "nodeId": "18:234",
    "sourceHash": "804f72d99b0a9be2d56e23701245d5b242902bf3",
    "sha256": "221c4679e07d2edae68b1c17b5b92c298c0e3d7877ac587861c2c8c1a22378f0",
    "url": "/assets/figma/eyes/eye-compact-07.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-08",
    "role": "eye",
    "nodeId": "18:268",
    "sourceHash": "b262404ff8d69aeae77829c8911af1ae832f0145",
    "sha256": "99f1e44161704c121ab0e378dc08c411a969e811cbffd7fd92b6e8849d8dce2a",
    "url": "/assets/figma/eyes/eye-compact-08.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "eye-compact-09",
    "role": "eye",
    "nodeId": "18:272",
    "sourceHash": "c5705d9a060c5fa55e3eea14cd19d6123b077e7d",
    "sha256": "80c9191c086d41deb3f9b4b2a04c0b0a1a65c6b715ace8938deffc813ebaf947",
    "url": "/assets/figma/eyes/eye-compact-09.svg",
    "width": 131,
    "height": 66.9556,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "subject-lotus",
    "role": "subject",
    "nodeId": "57:4113",
    "sourceHash": "719d50b0198dbab7051f679039ac0d949e9d7ca7",
    "sha256": "362832da8355d8a1b2bbf2af8639ec5d5c2c8dd511934bcdc19bcdd2442a5cc0",
    "url": "/assets/figma/subjects/subject-lotus.png",
    "width": 852,
    "height": 868,
    "requiredFor": [
      "18:113",
      "103:3593",
      "109:3669"
    ]
  },
  {
    "id": "subject-elder-figure",
    "role": "subject",
    "nodeId": "103:3598",
    "sourceHash": "9e44f7d6a4d0d7d47a0093f25a4ece3ca09426ff",
    "sha256": "37756daee9a07bff6c7db084ec71ecee7f732925d6e74b1c6e7ae4ccd14cba5b",
    "url": "/assets/figma/subjects/subject-elder-figure.png",
    "width": 642,
    "height": 350,
    "requiredFor": [
      "103:3593"
    ]
  },
  {
    "id": "scene-bug-left",
    "role": "reference",
    "nodeId": "18:239",
    "sourceHash": "c7c2c5f2ae0a5e6593f612b946b8813289af87a5",
    "sha256": "46aa41153375a8b6e46db8afe0ae85a07a8f1c385dd86314d786452b7164fb37",
    "url": "/assets/figma/references/scene-bug-left.svg",
    "width": 32.9016,
    "height": 66.7512,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-bug-right",
    "role": "reference",
    "nodeId": "18:251",
    "sourceHash": "eedcb964037d655677603d6cd326179183ea4b13",
    "sha256": "5e9032fe484b2cf3024dcb0c3c37b49b377109c8ea5a0772dd819f782f01b669",
    "url": "/assets/figma/references/scene-bug-right.svg",
    "width": 32.9016,
    "height": 66.7512,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-bug-upright",
    "role": "reference",
    "nodeId": "18:257",
    "sourceHash": "c1a32b19f72ef00ffac94ab6f56725de9bdd4516",
    "sha256": "0916729f6f461813cd783058f87fa789470c247261dabd8de012b057baf6bebd",
    "url": "/assets/figma/references/scene-bug-upright.svg",
    "width": 32.9016,
    "height": 66.7512,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-drag-handle",
    "role": "control-icon",
    "nodeId": "103:3210",
    "sourceHash": "ca3073ceb882dfc444360123f5fdc48e476e6770",
    "sha256": "44cd032f38e406f40f0a1142a428f3e44bc5120ff58f152e5004712172b073af",
    "url": "/assets/figma/icons/scene-control-drag-handle.svg",
    "width": 17.3333,
    "height": 24,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-selected-well",
    "role": "control-icon",
    "nodeId": "152:9276",
    "sourceHash": "c775c85ade019499e81b4651295ac8b61fdbc3da",
    "sha256": "ed15b93582af4b20d93605af23cbee3ab8000aa9c929cfa4ad360fa52c4a353b",
    "url": "/assets/figma/icons/scene-control-selected-well.svg",
    "width": 46,
    "height": 50,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-eye-outline",
    "role": "control-icon",
    "nodeId": "102:2482",
    "sourceHash": "23b6634745f75782d7a4cf6e35a56a930a51cb4b",
    "sha256": "0ade07c9ee7f3cfc1f561c9bae68a48fca1cf9aed63395beac380a3c77bc37a6",
    "url": "/assets/figma/icons/scene-control-eye-outline.svg",
    "width": 14.6667,
    "height": 25.6151,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-eye-pupil",
    "role": "control-icon",
    "nodeId": "102:2483",
    "sourceHash": "7c94ba2927e8ccae04feaa480eacd9df56b207c9",
    "sha256": "0eba9317caca26e23af3d81f3d08ff59d3a9bb79a47e88df393f3fd15d60e136",
    "url": "/assets/figma/icons/scene-control-eye-pupil.svg",
    "width": 9.33333,
    "height": 9.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-hand-finger",
    "role": "control-icon",
    "nodeId": "102:2448",
    "sourceHash": "fd57738737b65455e120eb768cd99b03965290df",
    "sha256": "64e384e1d4439c7a0e74bf342493819854df2837d264955723a6b995cd3626d9",
    "url": "/assets/figma/icons/scene-control-hand-finger.svg",
    "width": 5.33333,
    "height": 7.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-hand-index",
    "role": "control-icon",
    "nodeId": "102:2452",
    "sourceHash": "a7267f188c1b8b4a562926d641325df1dcc67d29",
    "sha256": "51c8e427c1b0c9e9777885065aabed6160c91ea85b42962f6817eceb6337fa50",
    "url": "/assets/figma/icons/scene-control-hand-index.svg",
    "width": 5.33334,
    "height": 6.66667,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-hand-palm",
    "role": "control-icon",
    "nodeId": "102:2453",
    "sourceHash": "25dcb9df5df673b2db5b33e4ba2b9be2487465b8",
    "sha256": "3d15e98d51316ea7b942fc2ad87695752a51e96b5afb44cecf14eb1afb229d10",
    "url": "/assets/figma/icons/scene-control-hand-palm.svg",
    "width": 5.33333,
    "height": 17.3333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-hand-thumb",
    "role": "control-icon",
    "nodeId": "102:2451",
    "sourceHash": "60ea7b103cdc2a9b9d3ec980e3fe4f80e9625106",
    "sha256": "74575d3f9431f904a0ec2e3c683293f3aee936dfb0ef1b6622b0ecfd74366742",
    "url": "/assets/figma/icons/scene-control-hand-thumb.svg",
    "width": 5.33333,
    "height": 7.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-hand-wrist",
    "role": "control-icon",
    "nodeId": "102:2447",
    "sourceHash": "9df69fb5f997b6ce44683e320d67c08015d8328e",
    "sha256": "e50ae4a94d240269882439afbe2e4e5a42064f87ef38cade0dbe5d96fcf4483d",
    "url": "/assets/figma/icons/scene-control-hand-wrist.svg",
    "width": 21.3332,
    "height": 14.6667,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-bug-outline",
    "role": "control-icon",
    "nodeId": "102:2471",
    "sourceHash": "77b3bb28e0fd62a2a72864189eae1853a5e778d7",
    "sha256": "1ef4aa1671babb636d885d30dab016e7e31753adafad88c3880ce9ef8d863afe",
    "url": "/assets/figma/icons/scene-control-bug-outline.svg",
    "width": 20,
    "height": 28.1681,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-bug-body",
    "role": "control-icon",
    "nodeId": "102:2472",
    "sourceHash": "3de42d0c77268212a485f7ad76dc86d31d56038a",
    "sha256": "9d89318476696719b11cdd8dc07fed0bac421443f02561d598a84e70042f74e1",
    "url": "/assets/figma/icons/scene-control-bug-body.svg",
    "width": 9.33333,
    "height": 23.4431,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-divider",
    "role": "control-icon",
    "nodeId": "152:9284",
    "sourceHash": "250ab7af244a81acf824ba1bbfa0443b55daf60d",
    "sha256": "43e0bfed4e8bca6c13cc604fd0ac87c35949019463eeaf4b984a9ddeb99c90e3",
    "url": "/assets/figma/icons/scene-control-divider.svg",
    "width": 32,
    "height": 1,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-neutral-well",
    "role": "control-icon",
    "nodeId": "152:9286",
    "sourceHash": "f7b87a74f6126d0cf2628629e503afe3a82da96f",
    "sha256": "61f068f112ebe935e73bc497fde484e056086002de93c52afdbc0ba38f2f5760",
    "url": "/assets/figma/icons/scene-control-neutral-well.svg",
    "width": 32,
    "height": 32,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-filter-lines",
    "role": "control-icon",
    "nodeId": "103:2526",
    "sourceHash": "8692073f643cd95bfb85217b0654f09da6a0f2c8",
    "sha256": "bfffcd8d8a51d93c3f88365f5b40857de66af4d49d31afe1c026841587df9aae",
    "url": "/assets/figma/icons/scene-control-filter-lines.svg",
    "width": 25.3333,
    "height": 1.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-filter-knob",
    "role": "control-icon",
    "nodeId": "103:2537",
    "sourceHash": "7c6c2ca4a2259430dc76d92f610404a26c517245",
    "sha256": "6f5adc839eadab5adeaed70553d4a029eba736b13708fe10dbbd7f1fea2c9c30",
    "url": "/assets/figma/icons/scene-control-filter-knob.svg",
    "width": 6.66667,
    "height": 6.66667,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-text-subject",
    "role": "control-icon",
    "nodeId": "103:3201",
    "sourceHash": "13bcb27a62495331f2469dd667a906b05ff9761e",
    "sha256": "494b440167daccb221c5ca5c3db018eedf7d3aac0f7fd032b0b9fdd398d1af4e",
    "url": "/assets/figma/icons/scene-control-text-subject.svg",
    "width": 29,
    "height": 25,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-gallery-tile-primary",
    "role": "control-icon",
    "nodeId": "103:2527",
    "sourceHash": "24bfd9e1c6ea37076fc3fc1270dbf1db2bd8f4c3",
    "sha256": "b743fa6cc59e712f3095820b7dc0ba05b8b54cad8ca262508db205b80b4d8358",
    "url": "/assets/figma/icons/scene-control-gallery-tile-primary.svg",
    "width": 9.33333,
    "height": 9.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-gallery-tile-secondary",
    "role": "control-icon",
    "nodeId": "103:2530",
    "sourceHash": "ca1a648d497847b68f3932819eb8c07376ef932d",
    "sha256": "490a78974e015c131b1c9cb3e1b9c380a6a29832bbf6c2f4eb8ae04b7eaf2212",
    "url": "/assets/figma/icons/scene-control-gallery-tile-secondary.svg",
    "width": 9.33333,
    "height": 9.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "scene-control-gallery-tile-tertiary",
    "role": "control-icon",
    "nodeId": "103:2532",
    "sourceHash": "d173e49d49f9427fb09db7d8edbb16df5aa155c0",
    "sha256": "6b71e43239fd2cd9619028a73a355562a94e5552b22aef4ded62970a327d62bb",
    "url": "/assets/figma/icons/scene-control-gallery-tile-tertiary.svg",
    "width": 9.33333,
    "height": 9.33333,
    "requiredFor": [
      "18:113",
      "109:3669"
    ]
  },
  {
    "id": "control-hand-finger",
    "role": "control-icon",
    "nodeId": "102:2448",
    "sourceHash": "3d9f1dc0e0032542d8ed5fe54e6a86042dca67af",
    "sha256": "f58de42ca97a7e58c4710ce59c7547eb912943a4ccb1c483d759f1a7e0b4d9a6",
    "url": "/assets/figma/icons/control-hand-finger.svg",
    "width": 4,
    "height": 5.5,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-hand-index",
    "role": "control-icon",
    "nodeId": "102:2452",
    "sourceHash": "4bb23cf5262d3d4c3e46b6508c39d76969a75c78",
    "sha256": "e8a4585a625281862d7289a89db6a38ba9e6d882825b63a59c3e1d449837ce08",
    "url": "/assets/figma/icons/control-hand-index.svg",
    "width": 4,
    "height": 5,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-hand-palm",
    "role": "control-icon",
    "nodeId": "102:2453",
    "sourceHash": "5079d44080c3ad9094ee7df2a073ab766ece56a4",
    "sha256": "a2f78bf0c5910c51c42408e0e7d140a72a1b8bd48c1a8fae57bb25b01a2526f1",
    "url": "/assets/figma/icons/control-hand-palm.svg",
    "width": 4,
    "height": 13,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-hand-thumb",
    "role": "control-icon",
    "nodeId": "102:2451",
    "sourceHash": "f28a5f466d1b965d1876d300414cd61546fa325a",
    "sha256": "974dd0e7c8eaf65598b628a7b2a80cb0e30ada88191b96428396f41f534c9bc4",
    "url": "/assets/figma/icons/control-hand-thumb.svg",
    "width": 4,
    "height": 5.5,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-hand-wrist",
    "role": "control-icon",
    "nodeId": "102:2447",
    "sourceHash": "4cfa98e696e3249526ad971ab7e05a52542d6b8e",
    "sha256": "72da73e0d5a2824dc1338a0bcc42f231d5ea12bcb717b5b05033ca6eb9cb24bc",
    "url": "/assets/figma/icons/control-hand-wrist.svg",
    "width": 15.9999,
    "height": 11,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-bug-outline",
    "role": "control-icon",
    "nodeId": "102:2471",
    "sourceHash": "35ad6140416e29d0823f3a3e1c2fd3f415d9570f",
    "sha256": "22dae1a534d97052d19052a305d247d7635682f3342eafb017a0a0df036ac36b",
    "url": "/assets/figma/icons/control-bug-outline.svg",
    "width": 15,
    "height": 21.126,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-bug-body",
    "role": "control-icon",
    "nodeId": "102:2472",
    "sourceHash": "30cf425a670063ffb9cc20dfee2b471e4541ea9b",
    "sha256": "b0c36e9cde76013a18d62c299471749bf74d72f33bf4986c1f82cea8715ff1ee",
    "url": "/assets/figma/icons/control-bug-body.svg",
    "width": 7,
    "height": 17.5823,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-eye-outline",
    "role": "control-icon",
    "nodeId": "102:2482",
    "sourceHash": "6d9c3eae243c8ff1493995e322ef4c01015df388",
    "sha256": "c113ae9b497e94d675e093661c887770bde1f4c16ca866b21e6cafdb42889d9f",
    "url": "/assets/figma/icons/control-eye-outline.svg",
    "width": 11,
    "height": 19.2114,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-eye-pupil",
    "role": "control-icon",
    "nodeId": "102:2483",
    "sourceHash": "de1f69f1201c8f0c04ffc2867d16309834a19002",
    "sha256": "ad106ae2c96ebb6693d24239967daeee5a17eb96bd1bc130cda0609ee844bc00",
    "url": "/assets/figma/icons/control-eye-pupil.svg",
    "width": 7,
    "height": 7,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-quantity-plus",
    "role": "control-icon",
    "nodeId": "103:2513",
    "sourceHash": "046667a30fe2030d8493116304374a51298c6e71",
    "sha256": "5f7f8e1770a0c7446dee26b140e02946b08f73da0d01614c46a8e8d17bacd0fe",
    "url": "/assets/figma/icons/control-quantity-plus.svg",
    "width": 15,
    "height": 1,
    "requiredFor": [
      "103:2490",
      "103:3579"
    ]
  },
  {
    "id": "control-horizontal-stroke",
    "role": "control-icon",
    "nodeId": "103:2514",
    "sourceHash": "e3db442d36d2f3b2a3bfa034f1e5338f9c09fbe8",
    "sha256": "3987a081c5841e8f3928f78a9565cc4ae208bdc3866418d4231d3a687af1ce12",
    "url": "/assets/figma/icons/control-horizontal-stroke.svg",
    "width": 15,
    "height": 1,
    "requiredFor": [
      "103:2490",
      "103:3579"
    ]
  },
  {
    "id": "control-gallery-tile-primary",
    "role": "control-icon",
    "nodeId": "103:2527",
    "sourceHash": "ffe45b1d71c1d67a3749798a2c9934c1d5b6c98d",
    "sha256": "bd331f86b9de8b0a86d6023a457d34a93c00ae10e501a19b67b520f6f517b3ed",
    "url": "/assets/figma/icons/control-gallery-tile-primary.svg",
    "width": 7,
    "height": 7,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-gallery-tile-secondary",
    "role": "control-icon",
    "nodeId": "103:2530",
    "sourceHash": "4e00ff42ae4e9f675e9bfc57710be7bc6e852778",
    "sha256": "5e5eaacc7f3b90e1f1c828825d68cd93dc219c80d62102c7ec5e76bf826535a3",
    "url": "/assets/figma/icons/control-gallery-tile-secondary.svg",
    "width": 7,
    "height": 7,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-gallery-tile-tertiary",
    "role": "control-icon",
    "nodeId": "103:2532",
    "sourceHash": "db36c1f6b99314f837c52cfd6f9c78e202ae3968",
    "sha256": "10bb5afa4001cfaad43f090ede3c2c7dfdf13c2ac1fc969d215b2c79b983c4bf",
    "url": "/assets/figma/icons/control-gallery-tile-tertiary.svg",
    "width": 7,
    "height": 7,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-filter-lines",
    "role": "control-icon",
    "nodeId": "103:2526",
    "sourceHash": "44df96a719b21cd5b830b355fa7986f1710662e0",
    "sha256": "48560fcdf4a30bd8657157a98b02e33c0b3ecb281920b721f2bc0351ddb348aa",
    "url": "/assets/figma/icons/control-filter-lines.svg",
    "width": 19,
    "height": 1,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-filter-knob",
    "role": "control-icon",
    "nodeId": "103:2537",
    "sourceHash": "ca89bb906cfc6377b290f6cdb973353e75f51c9d",
    "sha256": "3b9f51d8d3b633a5954554dd7050abc2f4ad78fda2e9f20b8fa8996543d6d388",
    "url": "/assets/figma/icons/control-filter-knob.svg",
    "width": 5,
    "height": 5,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-text-subject",
    "role": "control-icon",
    "nodeId": "103:3201",
    "sourceHash": "52805754dbad3047f7310b4a5f1dc350affd2b74",
    "sha256": "630134384e4171dcfc80fa89eb1eb1ba3d922a2821d380086828df0936711978",
    "url": "/assets/figma/icons/control-text-subject.svg",
    "width": 22,
    "height": 19,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "control-drag-handle",
    "role": "control-icon",
    "nodeId": "103:3210",
    "sourceHash": "658aaa5274c383c8d4d344cfaee41de3691f76f2",
    "sha256": "7b4c4824de4aad8701acb250dc40aa1274cc9bc369dd55dfb47c9e0ea8f8a84b",
    "url": "/assets/figma/icons/control-drag-handle.svg",
    "width": 13,
    "height": 18,
    "requiredFor": [
      "103:2490"
    ]
  },
  {
    "id": "filter-panel-divider",
    "role": "control-icon",
    "nodeId": "103:3587",
    "sourceHash": "06373f10968c5ccbc518bd2ba80465f882a9cb96",
    "sha256": "1bb0aadaf7d13913be2074f4b8221b5547f6a1a4079cbd638671c3606f472ed9",
    "url": "/assets/figma/icons/filter-panel-divider.svg",
    "width": 106,
    "height": 1,
    "requiredFor": [
      "103:3579"
    ]
  },
  {
    "id": "filter-repel-track",
    "role": "control-icon",
    "nodeId": "103:3591",
    "sourceHash": "89b368c747a9f1cac858d748e5f4165565db429b",
    "sha256": "e2fe3d2a0e95e4d34458dd110656fe259f7cfd2344b08abee416370896df5fa2",
    "url": "/assets/figma/icons/filter-repel-track.svg",
    "width": 95,
    "height": 1,
    "requiredFor": [
      "103:3579"
    ]
  },
  {
    "id": "filter-repel-thumb",
    "role": "control-icon",
    "nodeId": "103:3592",
    "sourceHash": "c31cd698d13f2b435c90d011f6d8f98ab359c6c4",
    "sha256": "eacc6207f405b47ede0537c8254e224a12c97483583c69d59dc0a196f0a5992e",
    "url": "/assets/figma/icons/filter-repel-thumb.svg",
    "width": 18,
    "height": 18,
    "requiredFor": [
      "103:3579"
    ]
  },
  {
    "id": "attack-target-glow",
    "role": "reference",
    "nodeId": "109:3958",
    "sourceHash": "ac7e49780f8858d3995fe4def1b8cd6afad882c4",
    "sha256": "5b675e005b9969ec569c6ebb261c29902079a499dba393bc24b3d571887637ba",
    "url": "/assets/figma/references/attack-target-glow.svg",
    "width": 189,
    "height": 189,
    "requiredFor": [
      "109:3669"
    ]
  }
] satisfies readonly FigmaAssetEntry[]);

export function requiredAssetsFor(id: string): readonly FigmaAssetEntry[] {
  return FIGMA_ASSETS.filter((entry) => entry.requiredFor.includes(id));
}
