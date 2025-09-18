import axios from 'axios'
import { Context, Schema, h } from 'koishi'

export const name = 'kyomiko-middleware'

export interface Config {
  server: string,
  Authorization: string
}

export const Config: Schema<Config> = Schema.object({
  server: Schema.string().description('接口服务器地址').required(),
  Authorization: Schema.string().description('接口服务器认证密钥')
})

declare module 'koishi' {
  interface Channel {
    serverList: {
      type: string
      host: string
      port: string
      name: string
      description?: string
    }[]
  }
}


export function apply(ctx: Context, config: Config) {
  // write your plugin here
  ctx.model.extend('channel', {
    serverList: {
      type: 'json',
      initial: []
    }
  })

  ctx.command('server', '服务器相关指令').subcommand('.list', '查看群里所有服务器的状态').alias('服务器状态').channelFields(['serverList']).action(async ({ session }) => {
    if (session.channel.serverList.length == 0) {
      return '该群没有服务器';
    }
    const result = await axios.get(config.server + '/server/list', {
      headers: {
        'Authorization': config.Authorization
      },
      params: {
        serverList: JSON.stringify(session.channel.serverList)
      }
    })
    return h.escape("\n" + result.data)
  })

  ctx.command('server', '服务器相关指令').subcommand('.add', '添加一个服务器到群里').alias('添加服务器').channelFields(['serverList'])
    .option('type', '-t <type> 服务器类型').option('ip', '-i <ip> 服务器地址').option('port', '-p <port> 服务器端口').option('name', '-n <name> 服务器名称').action(async ({ session, options }) => {
      const serverList = session.channel.serverList
      if (options.type == undefined || options.ip == undefined || options.port == undefined || options.name == undefined) {
        return session.execute('help server.add')
      }
      serverList.push({
        type: options.type,
        host: options.ip,
        port: options.port,
        name: options.name
      })
      return '添加成功'
    })

  ctx.command('server', '服务器相关指令').subcommand('.remove <服务器序号:number>', '从群里删除一个服务器').alias('删除服务器').channelFields(['serverList']).action(async ({ session, args }) => {
    const serverList = session.channel.serverList
    if (args[0] == undefined) {
      return session.execute('help server.remove')
    }
    if (args[0] > serverList.length) {
      return '不存在该服务器'
    }
    serverList.splice(args[0] - 1, 1)
    await session.channel.$update()
    const detail = await session.execute('server.detail')
    session.sendQueued('删除成功')
    session.sendQueued(detail)
  })

  ctx.command('server', '服务器相关指令').subcommand('.detail', '查看群里所有服务器详情信息').alias('服务器信息').channelFields(['serverList']).action(({ session }) => {
    const serverList = session.channel.serverList
    if (serverList.length == 0) {
      return '该群没有服务器';
    }
    let result = ''
    for (let i = 0; i < serverList.length; i++) {
      result += `服务器序号: ${i + 1}\n服务器名称: ${serverList[i].name}\n服务器地址: ${serverList[i].host}:${serverList[i].port}\n服务器类型: ${serverList[i].type}\n`
      if (serverList[i].description) {
        result += `服务器描述: ${serverList[i].description}\n`
      }
      result += '\n'
    }
    result = result.substring(0, result.length - 2)
    return h.escape(result)
  })

  ctx.command('mcauth', '皮肤站相关指令').subcommand('.registry <mc游戏内昵称>', '注册皮肤站账号').alias('注册皮肤站').userFields(['id']).action(async ({ session, args }) => {
    if (args[0] == undefined) {
      return session.execute('help mcauth.registry')
    }
    const result = await axios.post(config.server + '/auth/reg', {
      qq: session.user.id,
      name: args[0]
    }, {
      headers: {
        'Authorization': config.Authorization
      }
    })
    return h.escape(result.data)
  })

  ctx.command('mcauth', '皮肤站相关指令').subcommand('.reset', '重置皮肤站密码为随机密码').alias('重置皮肤站密码').userFields(['id']).action(async ({ session }) => {
    const result = await axios.post(config.server + '/auth/passwd',
      { qq: session.user.id }, {
      headers: {
        'Authorization': config.Authorization
      }
    })
    return h.escape(result.data)
  })

  ctx.command('gal', 'gal相关指令').subcommand('.info <关键词|id>', '搜索galgame信息').alias('gal查询').userFields(['id']).channelFields(['id']).action(async ({ session, args }) => {
    if (args[0] == undefined) {
      return session.execute('help gal.info')
    }
    const result = await axios.get(config.server + '/gal/info', {
      headers: {
        'Authorization': config.Authorization
      },
      params: {
        id: session.user.id,
        channelId: session.channel.id,
        keyword: args[0] || ''
      }
    })
    return h.escape(result.data)
  })

  ctx.command('gal', 'gal相关指令').subcommand('.alias <游戏ID> <别名>', '对gal进行别名设置').alias('gal别名').userFields(['id']).channelFields(['id']).action(async ({ session, args }) => {
    if (args[0] == undefined || args[1] == undefined) {
      return session.execute('help gal.alias')
    }

    const result = await axios.post(config.server + '/gal/alias', {
      id: session.user.id,
      channelId: session.channel.id,
      gameId: args[0] || '',
      alias: args[1]
    }, {
      headers: {
        'Authorization': config.Authorization
      }
    })
    return h.escape(result.data)
  })

  ctx.command('gal', 'gal相关指令').subcommand('.score <游戏ID> <评分>', '对gal进行评分').alias('gal评分').userFields(['id']).channelFields(['id']).action(async ({ session, args }) => {
    if (args[0] == undefined) {
      return session.execute('help gal.score')
    }

    const result = await axios.post(config.server + '/gal/score', {
      id: session.user.id,
        channelId: session.channel.id,
        gameId: args[0] || '',
        score: args[1]
    }, {
      headers: {
        'Authorization': config.Authorization
      }
    })
    return h.escape(result.data)
  })

  ctx.command('gal', 'gal相关指令').subcommand('.scoreInfo', '查看gal评分说明').alias('gal评分说明').userFields(['id']).channelFields(['id']).action(async ({ session, args }) => {
    return '\n评分支持1-10的整数与半分，评分为0时清除对该游戏的评分\n' +
      '10分：神作级别，近乎完美\n' +
      '9分：佳作，强烈推荐\n' +
      '8分：优秀作品，值得一玩\n' +
      '7分：良作，有可取之处\n' +
      '6分：及格线，普通水准\n' +
      '5分：平庸，不推荐不反对\n' +
      '4分：略差，不太推荐\n' +
      '3分：较差，明显缺陷\n' +
      '2分：很差，不建议尝试\n' +
      '1分：极差，完全不推荐\n' +
      '建议剧情占比40%，角色塑造占比25%，画面人设20%，游戏系统15%\n'+
      '加权评分会基于vndb分数、群评分人数等做贝叶斯加权处理';
  })
}
