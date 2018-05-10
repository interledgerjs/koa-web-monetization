const path = require('path')
const fs = require('fs-extra')
const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const KoaWebMonetization = require('..')
const monetizer = new KoaWebMonetization()

router.get('/', async ctx => {
  ctx.set('content-type', 'text/html')
  ctx.body = fs.readFileSync(path.resolve(__dirname, 'index.html'))
})

router.get('/content/', async ctx => {
  await ctx.awaitBalance(100)
  ctx.spend(100)
  ctx.body = await fs.readFile(path.resolve(__dirname, 'example.png'))
})

app
  .use(monetizer.mount())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
