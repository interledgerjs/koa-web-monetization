const path = require('path')
const fs = require('fs-extra')
const Koa = require('koa')
const app = new Koa()
const compose = require('koa-compose')
const router = require('koa-router')()
const KoaWebMonetization = require('..')
const monetizer = new KoaWebMonetization()

router.get('/', async ctx => {
  ctx.set('content-type', 'text/html')
  ctx.body = fs.readFileSync(path.resolve(__dirname, 'index.html'))
})

router.get('/client.js', async ctx => {
  ctx.body = await fs.readFile(path.resolve(__dirname, '../client.js'))
})

router.get('/content/', async ctx => {
  await ctx.awaitBalance(100)
  ctx.spend(100)
  ctx.body = await fs.readFile(path.resolve(__dirname, 'example.png'))
})

app
  .use(compose([monetizer.mount(), router.middleware()]))
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
