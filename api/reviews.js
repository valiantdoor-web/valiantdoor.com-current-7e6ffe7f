// Owner-confirmed static review counts, updated October 10, 2026.
// Keep the header and all review counters consistent through this endpoint.
const STATS = { googleRating: 5.0, googleReviewCount: 96, nextdoorFaves: 59, source: 'static' }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60')
  res.statusCode = 200
  res.end(JSON.stringify(STATS))
}
