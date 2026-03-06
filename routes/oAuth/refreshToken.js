const fetch = require("node-fetch");
const queryString = require("query-string");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

module.exports = async function refreshAccessToken(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return null;
  try {
    const query = queryString.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await fetch("https://accounts.spotify.com/api/token?" + query, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
      },
    });
    const data = await response.json();
    if (!data.access_token) return null;
    res.cookie("accessToken", data.access_token, {
      sameSite: "lax",
      secure: isProduction,
    });
    if (data.refresh_token) {
      res.cookie("refreshToken", data.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
      });
    }
    return data.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
};
