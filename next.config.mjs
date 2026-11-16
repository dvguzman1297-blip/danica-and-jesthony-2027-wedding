/** Large media never changes under the same name, so let browsers keep it for a year.
 *  If you replace one of these files, rename it (e.g. music-v2.mp3) and update the path in the code. */
const longCache = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return ["/music-v2.mp3","/background.mp4", "/viewdeck.mp4"].map((source) => ({ source, headers: longCache }));
  },
};
export default nextConfig;
