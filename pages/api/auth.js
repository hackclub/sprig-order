// start oauth flow with github

export default async (req, res) => {
  // redirect the user to the github oauth page
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID)
  url.searchParams.set('redirect_uri', 'https://sprig-order.hackclub.com/api/callback')

  res.redirect(302, url.toString())
}