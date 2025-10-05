// start oauth flow with github

const encodeState = (query = {}) => {
  const base = Buffer.from(JSON.stringify(query)).toString('base64')
  return base.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default async (req, res) => {
  const params = req.query || {}

  const requiredFields = ['idv_rec', 'first_name', 'last_name', 'email']
  const missingRequired = requiredFields.some((field) => {
    const value = params[field]
    if (Array.isArray(value)) return value.length === 0
    return !value
  })

  if (missingRequired) {
    return res.redirect(302, 'https://submit.hackclub.com/sprig')
  }

  // redirect the user to the github oauth page
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID)
  url.searchParams.set('redirect_uri', 'https://sprig-order.hackclub.com/api/callback')
  url.searchParams.set('state', encodeState(params))

  res.redirect(302, url.toString())
}
