# Foal Passkeys

A demonstration of how to use passkeys with a server based on the [FoalTS](https://foalts.org) application framework.

## References

This demo was built based on the article: [https://www.corbado.com/blog/passkey-tutorial-how-to-implement-passkeys](https://www.corbado.com/blog/passkey-tutorial-how-to-implement-passkeys).

This implementation uses the @simplewebauthn/server and @simplewebauthn/browser packages. Documenation on these can be found at:
[https://simplewebauthn.dev/docs/](https://simplewebauthn.dev/docs/)

## Capabilities

1. Allows HTML+Javascript registration of a passkey with the server
2. Allows HTML+Javascript login using a registered passkey
3. Storage of Registered Users and Credentials (passkeys) in a database using TypeORM. (Only SqLite tested).

## Assumptions

1. User email address is used as a unique userId.
2. Currently limits single passkey per User.
3. The site is running on http://localhost:3001
4. This has only been run on macOS 15.2 with Safari
5. Only a limited flow for webauthn (the underlying protocol) has been implemented.

## Installation
```sh
git clone https://github.com/warren-gallagher/foal-passkeys.git
cd foal-passkeys
npm install
npm run migrations
```

## Start the server
```sh
npm run dev
```

## Execute the demo
1. Open a web browser to [http://localhost:3001](http://localhost:3001)
2. Enter a valid email address in the Email field.
3. Click the "Register" button. 
  3.1 Follow the prompts to authenticate
  3.2 (After a moment you should see a "Registration successful" message).
4. With the same email address entered, Click the "Login" button. 
  4.1 Follow the prompts to authenticate
  4.2 (After a moment you should see a "Login successful" message).

## Modifying the demo

### Configuration

```json
{
  "port": "env(PORT)",
  "settings": {
    "loggerFormat": "foal",
    "logger": {
      "logLevel": "debug"
    },
    "cookieParser": {
      "secret": "cookie signing secret"
    }
  },
  "database": {
    "type": "sqlite",
    "database": "./db.sqlite3"
  },
  "relyingParty": {
    "name": "Passkeys",
    "id": "localhost",
    "origin": "http://localhost:3001"
  }
}
```
### Browser code

Can be found in `public/index.html`, `public/js/script.js` and `public/css/style.css`

### Registration flow

Can be found in `src/app/controllers/passkey-registration.controller.ts`

### Authentication flow

Can be found in `src/app/controllers/passkey-authentication.controller.ts`





