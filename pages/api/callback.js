export default async (req, res) => {
  // get the code from the query string
  const { code } = req.query

  if (!code) {
    return res.status(400).json({
      error: true,
      details: req.query
    })
  }

  // exchange the code for an access token
  const url = new URL('https://github.com/login/oauth/access_token')
  // url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID)
  // url.searchParams.set('client_secret', process.env.GITHUB_CLIENT_SECRET)
  // url.searchParams.set('code', code)
  const accessToken = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  }).then(r => r.json()).then(r => r['access_token'])

  if (!accessToken) {
    return res.status(400).json({
      error: true,
      details: "Could not get access token"
    })
  }

  // use access token to get username from github
  const { login } = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${accessToken}`,
    }
  }).then(r => r.json())

  // record the access token in the database
  const airtableID = await fetch('https://api2.hackclub.com/v0.2/Sprig Waitlist/Authentication', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIRBRIDGE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'GitHub Token': accessToken,
      'GitHub Username': login
    })
  }).then(r => r.json()).then(r => r.id)

  // redirect the user to the submission form
  const formUrl = new URL('https://airtable.com/shrePmF41sbxEXqkZ')
  formUrl.searchParams.set('prefill_GitHub Username', login)
  formUrl.searchParams.set('prefill_Authentication ID', airtableID)

  res.redirect(302, formUrl.toString())
}