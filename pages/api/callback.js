const decodeState = (state) => {
  if (!state) return {}

  const toBase64 = (input) => {
    let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const paddingNeeded = (4 - (normalized.length % 4)) % 4;
    return normalized.padEnd(normalized.length + paddingNeeded, '=');
  }

  try {
    const decoded = Buffer.from(toBase64(state), 'base64').toString('utf8')
    const parsed = JSON.parse(decoded)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (err) {
    try {
      const parsed = JSON.parse(state)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch (jsonErr) {
      return { pr: state }
    }
  }
}

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
  const airbridgeUrl = new URL('https://api2.hackclub.com/v0.2/Sprig Waitlist/Authentication')
  airbridgeUrl.searchParams.set('authKey', process.env.AIRBRIDGE_TOKEN)
  const airtableID = await fetch(airbridgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'GitHub Token': accessToken,
      'GitHub Username': login
    })
  }).then(r => r.json()).then(r => r.id)

  const preservedParams = decodeState(req.query.state)
  const queryParams = (preservedParams && typeof preservedParams === 'object' && !Array.isArray(preservedParams)) ? preservedParams : {}

  // redirect the user to the submission form
  const formUrl = new URL('https://forms.hackclub.com/t/kJLdGnDbtUus')
  formUrl.searchParams.set('g', login)
  formUrl.searchParams.set('s', airtableID)
  const preservedPr = queryParams.pr || queryParams.p || req.query.pr
  if (preservedPr) {
    formUrl.searchParams.set('p', preservedPr)
  }

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue
    if (['pr', 'p', 'code', 'state'].includes(key)) continue

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          formUrl.searchParams.append(key, entry)
        }
      })
    } else {
      formUrl.searchParams.set(key, value)
    }
  }

  res.redirect(302, formUrl.toString())
}
