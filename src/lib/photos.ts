// Photography used across the app. These are currently served from Higgsfield's
// CDN (where they were generated). To self-host, copy them into /public/images and
// point these at /images/... paths instead.

export const PHOTO_CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3BcFgqenGreTJjJ06PnNgZqYdaE/";

const hf = (file: string) => `${PHOTO_CDN}${file}`;

export const PHOTOS = {
  food: hf("hf_20261022_040537_666e7f2a-0d39-40fc-836e-432c2c78508b.png"),
  groceries: hf("hf_20261022_040538_cf449a03-273f-46fd-be76-073b625af08d.png"),
  gas: hf("hf_20261022_040535_578b012b-c594-4d9c-859c-9a6aa0ab288d.png"),
  pickup: hf("hf_20261022_040536_aa6a1944-1abf-452f-b1c5-e266ae9ccf70.png"),
  laundry: hf("hf_20261022_040537_042d4b74-67e9-43b9-9253-067e103446ea.png"),
  other: hf("hf_20261022_040537_17363240-af27-473e-aab9-19a75ddb786f.png"),
  shopKitchen: hf("hf_20261022_040536_c2ef99fe-65b2-49aa-ad7e-1d9f173ec2f6.png"),
  shopMart: hf("hf_20261022_040536_4336f947-c006-418c-9b03-b8ef9fd32291.png"),
  shopGas: hf("hf_20261022_040535_1aea690b-4436-4ec9-bb4b-41c06f49b490.png"),
  shopDryCleaner: hf("hf_20261022_040536_0d72f783-6d19-4a60-820b-9bf9ede8e228.png"),
  shopSuya: hf("hf_20261022_040537_07fd3bf6-38c1-49e2-945d-b298bcb6a8ad.png"),
  shopPharmacy: hf("hf_20261022_040535_e6bd562d-860c-47a0-938d-1df29dc649cb.png"),
  heroRider: hf("hf_20261022_040540_2589512f-2ab8-44ca-870e-fd9367bcb2af.png"),
} as const;

/** Photos that can be stored as a shop's cover: admin uploads, bundled images, or our CDN set. */
export function isAllowedShopImage(url: string): boolean {
  return (
    /^\/api\/uploads\/[0-9a-f-]{36}$/i.test(url) ||
    /^\/images\/[a-z0-9/_-]+\.(webp|jpg|png)$/i.test(url) ||
    (url.startsWith(PHOTO_CDN) && /^[\w.-]+\.(png|webp|jpg)$/i.test(url.slice(PHOTO_CDN.length)))
  );
}
