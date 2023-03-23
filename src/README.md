
```
src
├─ config
│  ├─ config.js
│  ├─ logger.js
│  ├─ morgan.js
│  ├─ passport.js
│  ├─ roles.js
│  └─ tokens.js
├─ controllers
│  ├─ auth.controller.js
│  ├─ chatroom.controller.js
│  ├─ file.controller.js
│  └─ index.js
├─ docs
│  ├─ components.yml
│  └─ swaggerDef.js
├─ index.js
├─ local_test.js
├─ middlewares
│  ├─ auth.js
│  ├─ auth_archive.js
│  ├─ error.js
│  ├─ rateLimiter.js
│  ├─ upload.js
│  └─ validate.js
├─ models
│  ├─ chatroom.model.js
│  ├─ index.js
│  ├─ message.model.js
│  ├─ plugins
│  │  ├─ index.js
│  │  ├─ paginate.plugin.js
│  │  └─ toJSON.plugin.js
│  ├─ token.model.js
│  └─ user.model.js
├─ routes
│  └─ v1
│     ├─ auth.route.js
│     ├─ chatroom.route.js
│     ├─ docs
│     │  ├─ auth.route.docs.js
│     │  ├─ definition
│     │  │  ├─ components.yml
│     │  │  └─ swaggerDef.js
│     │  └─ user.route.docs.js
│     ├─ docs.route.js
│     ├─ file.route.js
│     ├─ index.js
│     └─ user.route.js
├─ services
│  ├─ auth.service.js
│  ├─ email.service.js
│  ├─ index.js
│  ├─ sms.service.js
│  ├─ token.service.js
│  └─ user.service.js
├─ socket.io
│  ├─ socket.controllers
│  │  ├─ chat.controller.js
│  │  └─ index.js
│  ├─ socket.routes
│  │  ├─ chat.route.js
│  │  └─ index.js
│  └─ socket.services
│     ├─ index.js
│     └─ message.service.js
├─ utils
│  ├─ ApiError.js
│  ├─ catchAsync.js
│  ├─ pick.js
│  └─ utils.js
└─ validations
   ├─ auth.validation.js
   ├─ custom.validation.js
   ├─ index.js
   └─ user.validation.js

```