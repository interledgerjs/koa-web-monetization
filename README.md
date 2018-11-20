# DEPRECATED
This module has been deprecated in favor of [web-monetization-receiver](https://github.com/interledgerjs/web-monetization-receiver).

# Koa Web Monetization
> Charge for resources and API calls with web monetization

- [Overview](#overview)
- [Example Code](#example-code)
- [Try it Out](#try-it-out)
  - [Prerequisites](#prerequisites)
  - [Install and Run](#install-and-run)
- [API Docs](#api-docs)
  - [Constructor](#constructor)
  - [Receiver](#receiver)
  - [Paid](#paid)

## Overview

Using [Interledger](https://interledger.org) for payments, [Web
Monetization](https://github.com/interledger/rfcs/blob/master/0028-web-monetization/0028-web-monetization.md#web-monetization)
allows sites to monetize their traffic without being tied to an ad network. And
because payments happen instantly, they can also be tracked on the server-side
to unlock exclusive content or paywalls.

`koa-web-monetization` makes this easy by providing middleware for your
[Koa](http://koajs.com/) application. Charging your users is as easy as putting
`ctx.spend(100)` in your route handler. No need to convince them to
buy a subscription or donate.

## Example Code

Below is an example of some of the functions that you would use to create
paywalled content. For a complete and working example, look at the next
section.

```js
const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const KoaWebMonetization = require('koa-web-monetization')
const monetizer = new KoaWebMonetization()

// This endpoint charges 100 units to the user with :id
// If awaitBalance is set to true, the call will stay open until the balance is sufficient. This is convenient
// for making sure that the call doesn't immediately fail when called on startup.
router.get('/content/', async ctx => {

  await ctx.awaitBalance(100)
  ctx.spend(100)
  // load content
})

router.get('/', async ctx => {
  // load index page
})

app
  .use(monetizer.mount())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
```

The client side code to support this is very simple too:

```html
<body>
  <h1>Hello World</h1>
  <p>Underneath this is a paid image. It will load if you have web monetization on.</p>
  <div id="container">
    <!-- Paid image will be appended here -->
  <img src="/content" width="600"/>
  </div>
  <script src="/client.js"></script>
  <script>
    var monetizerClient = new MonetizerClient();
    monetizerClient.start()
  </script>
</body>

```

## Try it out

This repo comes with an example server that you can run. It serves a page that has a single paywalled image on it.
The server waits for money to come in and then shows the image.

### Prerequisites

- You should be running [Moneyd](https://github.com/interledgerjs/moneyd-xrp)
  for Interledger payments. [Local
  mode](https://github.com/interledgerjs/moneyd-xrp#local-test-network) will work
  fine.

- Build and install the [Minute](https://github.com/sharafian/minute)
  extension. This adds Web Monetization support to your browser.

### Install and Run

```sh
git clone https://github.com/sharafian/koa-web-monetization.git
cd koa-web-monetization
npm install
DEBUG=koa* node example/index.js
```

Now go to [http://localhost:8080](http://localhost:8080), and watch the server
logs.

If you configured Minute and Moneyd correctly, you'll start to see that money
is coming in. Once the user has paid 100 units, the example image will load on
the page.

## API Docs

### Constructor

```ts

new KoaWebMonetization(opts: Object | void): KoaWebMonetization
```

Create a new `KoaWebMonetization` instance.

- `opts.plugin` - Supply an ILP plugin. Defaults to using Moneyd.
- `opts.maxBalance` - The maximum balance that can be associated with any user. Defaults to `Infinity`.
- `opts.receiveEndpointUrl` - The endpoint in your Koa route configuration that specifies where a user pays streams PSK packets to your site. Defaults to `/__monetizer/{id}` where `{id}` is the server generated ID (stored in the browser as a cookie).
- `opts.clientFilePath` - This sets the endpoint which specifies where you want to serve the MonetizerClient file to your frontend. Your html script source must match this.
- `opts.cookieName` - The cookie key name for your server generated payer ID. Defaults to `__monetizer`.
- `opts.cookieOptions` - Cookie configurations for Koa. See [Koa ctx setting cookies options](http://koajs.com/) for more details! httpOnly has to be false for the monetizer to work!
### Receiver

```ts
instance.mount(): Function
```
This middleware allows cookies to be generated (or just sent if already set) from the server to the client. It also injects the `awaitBalance` and `spend` methods described below. It also serves the MonetizerClient below to the client side.


```ts
new MonetizerClient(opts: Object | void): MonetizerClient
```
Creates a new `MonetizerClient` instance.

- `opts.url` - The url of the server that is registering the KoaWebMonetization plugin. Defaults to `new URL(window.location).origin`
- `opts.cookieName` - The cookie key name that will be saved in your browser. Defaults to `__monetizer`. This MUST be the same has `opts.cookieName` in the server configuration.
- `opts.receiveEndpointUrl` - The endpoint where users of the site can start streaming packets via their browser extension or through the browser API. Defaults to `opts.url + '__monetizer/:id'` where id is the server generated payer ID. This MUST be the same has `opts.receiverEndpointUrl` in the server configuration.

### Middleware for cookies



### Charging users

The methods `ctx.spend()` and `ctx.awaitBalance()` are available to use inside handlers.

```ts
ctx.spend(amount): Function
```
Specifies how many units to charge the user.

```ts
ctx.awaitBalance(amount): Function
```
Waits until the user has sufficient balance to pay for specific content.
`awaitBalance` can be useful for when a call is being done at page start.
Rather than immediately failing because the user hasn't paid, the server will
wait until the user has paid the specified price.
