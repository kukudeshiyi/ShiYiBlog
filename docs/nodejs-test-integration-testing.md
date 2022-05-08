---
id: nodejs-test-integration-testing
title: 搭建nodejs项目集成测试环境并实现CI流程自动化
sidebar_label: 搭建nodejs项目集成测试环境并实现CI流程自动化
---

## 背景

为了对项目中的接口进行更真实的单元测试，最好的办法就是抛弃 mock，拥抱真实的数据环境，那要如何拥抱呢？

如果我们直接使用 test 环境的数据来进行测试，不仅会扰乱到正常的开发测试流程，而且多次测试时使用的数据可能都不相同。这种情况下，不仅无法保证单次测试的独立性，而且还会对后续定位问题带来困扰。

**_沿着上面的思路，我们可以简单总结一下我们到底想要些什么:_**

**_1.独立的，专门用于单元测试的数据环境。_**

**_2.并且保证每次测试之前数据是相同的。_**

下面我们来考虑一下该如何实现这两点需求。

首先是数据环境，我们的项目中用到了 redis、mysql。那最直接的，我们在本地搭建一个一模一样的环境用于测试。但是要考虑到这个环境不可能仅仅是自己用，而是所有参与项目开发的人也可以很简单的使用这个环境来对自己的代码进行测试。还有就是后续可以将这个测试环节添加到 CI 流程中，这样就可以在代码提交的时候触发对接口的单元测试，更进一步的保证代码质量。

所以我们选择使用 docker 应用容器来搭建我们的数据环境，并结合 docker-compose 将 redis、mysql 两个应用容器组合成一个数据环境服务。这样只要开发者安装了 docker、docker-compose 就可以一行命令来启动这个数据环境，感觉是不是比本地直接搭建好了许多。

第一个需求点解决了，下面我们来看第二个。

要保证每次测试时使用的数据都是相同的，我们可以在测试环境中导出一份数据文件作为用于后续测试的模板数据。这样，在每次测试之前，启动数据环境后，就可以向数据库中导入我们这份模板数据。

构想到此为止，那我们开始吧！

## 搭建测试环境

开始前，我们需要先安装 dokcer 以及 docker-compose 这两个基础服务，大家可以通过官网或者第三方教程来了解学习安装，我们就不再赘述。

因为我们都是使用的公共镜像，所以要做的事就是使用 docker-compose 组合出数据环境服务。更进一步讲我们只需要通过一份 YML 配置文件来告诉 docker-compose 要做些什么。

我先将配置好的文件放出来，然后简单解释一下各个配置项。

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d7170f52277b4f93896d403a64fe7050~tplv-k3u1fbpfcp-watermark.image)

### 一、配置文件基础结构

#### 1、version

定义版本信息。

#### 2、services

定义服务配置信息。

#### 3、image

定义了服务基于什么镜像进行初始化，如果镜像在本地不存在，则会尝试远程拉取这个镜像。

#### 4、container_name

定义容器服务名。

#### 5、command

定义了容器启动后执行的命令，这个可以覆盖掉镜像中定义的容器启动后默认的执行命令。

#### 6、ports

定义了映射端口信息，可以将容器内的服务端口映射到宿主机上。映射规则为（宿主机端口 ：容器端口）。

#### 7、volumes

定义了如何将物理主机中的目录映射到容器中（基于 docker 的数据卷机制），映射规则为（宿主机目录 ：容器内目录）。

#### 8、environment

定义环境变量。

### 二、为什么要这样配置，解决了什么问题

#### 1、虽然已经将容器内 redis 服务的端口映射到宿主机上，但是为什么还是连接不上？

我们在宿主机上尝试使用 medis 这个工具来连接容器中的 redis 的服务，但是此时是连接不上的。
首先想到的是不是密码问题。既然只是为了测试，不太需要考虑安全问题，是不是可以将其设置为免密模式呢？

经过检索，发现将配置文件中的 protected-mode 配置项设置为 no，即可开启 redis 的免密模式。

此时，就又暴露出一个问题，我们的配置文件该如何处理呢？因为容器服务是一次性的，我们总不能每次启动后手动去添加一份配置文件吧。所以这里我们就用到了 **volumes** 这个配置项，它可以将宿主机的文件映射到容器中。这样，我们就可以将配置文件放在项目目录中，就会在服务启动后，自动映射到容器中。

我们再通过 **command** 配置项添加启动命令，指定服务启动的配置文件即可。（由于 redis 配置文件很长，所以仅附上模板配置文件的[下载链接](https://redis.io/topics/config)。）

**_redis 配置文件：_**
![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f9a488ec0cfd4d888a3f8613cec38877~tplv-k3u1fbpfcp-watermark.image)

**_YML 配置项：_**
![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/52926f96e3924dd9b7b46bea7f361ea3~tplv-k3u1fbpfcp-watermark.image)

但是这个问题到此还没有结束，此时你会发现仍旧无法连接到 redis 服务，这又是因为什么原因呢？

其实在 redis 的配置文件中存在一个 bind 配置项，默认值为 127.0.0.1，这意味着 redis 只被允许进行本地连接。所以我们在宿主机环境是无法连接到容器内的 redis 服务的。解决办法就是我们将这个配置项注释掉就好了。

**_redis 配置文件：_**
![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/32cc19a372d54491a030961fc2e9b0ab~tplv-k3u1fbpfcp-watermark.image)

#### 2、向数据库中导入数据失败出现 "Got a packet bigger than 'max_allowed_packet' bytes"

从报错信息可以看得出，是 sql 文件太大超出导入上限所导致的，所以我们需要添加自定义配置文件来修改上限。同样我们将这份配置文件放到项目中，通过 **volumes** 配置项将其映射到容器中即可。

**_mysql 配置文件：_**

```
[mysqld]
# added to avoid err "Got a packet bigger than 'max_allowed_packet' bytes"
#
net_buffer_length=1000000
max_allowed_packet=1000000000
innodb_buffer_pool_size = 2000000000
#
```

**_YML 配置项_**
![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/418553e181444f04b9fc50c2b2e32061~tplv-k3u1fbpfcp-watermark.image)

## 实现测试流程自动化

YML 文件配置完毕，我们的数据环境就算搭起来了。那还有什么阻碍着我们测试流程自动化的目标呢？不知道各位在解决上一个问题的时候有没有疑问，要如何向数据库中导入数据呢？

答案就是，我们需要通过脚本在测试流程开始之前创建数据库并导入模板数据。

### 一、创建新的数据库

我们的项目中使用 knex 来连接数据库，但是 knex 在初始化连接数据库的时候就需要指定一个要连接的库名。
但是我们想要的是创建一个新的数据库，并向其中导入数据，这该怎么办呢？

经过摸索，我们可以先连接一个数据库中自带的初始库。这样，在 mysql 数据库中我们可以先连接 mysql 这个自带的初始库，然后通过 sql 语句创建一个新的数据库，并连接这个库。

**_我们的脚本如下：_**

```js
const TEST_DB = "test_db";
const cp = require("child_process");
const Knex = require("knex");
const hasDB = (dbs = [], dbName) => {
  return dbs.some((item) => item.Database === dbName);
};

const getDBConnectionInfo = ({
  host = "127.0.0.1",
  port = 6606,
  user = "root",
  password = "123456",
  database = "mysql",
}) => ({
  host,
  port,
  user,
  password,
  database,
});

const createDB = async () => {
  //  初始化连接
  let knex = Knex({
    client: "mysql",
    connection: getDBConnectionInfo({ database: "mysql" }),
  });

  // 判断是否已经存在要创建的库，如果是的话，删除该库
  const dbInfo = await knex.raw("show databases");
  if (hasDB(dbInfo[0], TEST_DB)) {
    await knex.raw(`drop database ${TEST_DB}`);
  }

  // 创建新库并进行连接
  await knex.raw(`create database ${TEST_DB}`);
  knex = Knex({
    client: "mysql",
    connection: getDBConnectionInfo({ database: TEST_DB }),
  });
};
```

### 二、导入模板数据

数据库已经创建好了，我们该考虑如何向库中导入模板数据（模板数据是从 test 环境中导出的 sql 文件）了。

#### 1、通过 knex 执行 sql 文件（失败）

首先想到的是，可以将 sql 文件内的 sql 语句全部读出来，提供给 knex 执行。但是很遗憾，并没有找到让 knex 执行多条 sql 语句的方法，所以第一种方法以失败告终。

#### 2、直接向库中导入 sql 文件（成功）

第一种方法失败，我们只能选择直接向库中导入 sql 文件的方式。

按照这个思路。首先，我们通过 **docker filter** 拿到标记 mysql 容器的 hash 值。然后，通过 **docker exec** 在该容器中执行命令，导入数据。

**_我们的脚本如下：_**

```js
const createDB = async () => {
  //  初始化连接
  let knex = Knex({
    client: "mysql",
    connection: getDBConnectionInfo({ database: "mysql" }),
  });

  // 判断是否已经存在要创建的库，如果是的话，删除该库
  const dbInfo = await knex.raw("show databases");
  if (hasDB(dbInfo[0], TEST_DB)) {
    await knex.raw(`drop database ${TEST_DB}`);
  }

  // 创建新库并进行连接
  await knex.raw(`create database ${TEST_DB}`);
  knex = Knex({
    client: "mysql",
    connection: getDBConnectionInfo({ database: TEST_DB }),
  });

  let containerHash;

  // 拿到容器 hash 值
  try {
    containerHash = await execCommand(
      "docker ps --filter 'name=project_database' -q"
    );
  } catch (e) {
    console.log("获取docker容器hash失败", e);
  }

  // 注入数据
  try {
    await execCommand(
      `docker exec -i ${containerHash.replace("\n", "")} /usr/init.sh`
    );
  } catch (e) {
    console.log("导入数据失败", e);
  }

  // 销毁连接
  knex.destroy();
};
```

**_docker exec 命令构造中要注意的地方：_**

1. 获取到的容器 hash 值带有换行符，会导致命令失败，所以需要将换行符去掉。

2. 如果直接将导入 sql 文件的 mysql 命令放在 docker exec 后面，会因为命令优先级问题，导致命令执行失败。所以我们在这里添加一个 init.sh，然后将脚本文件和 sql 文件一起映射到容器中。这样只要执行这个脚本文件即可，从而规避了优先级问题。

**_init.sh 文件内容如下：_**

```sh
# init.sh文件
#!/bin/bash

# 注入模板数据
mysql -uroot -p123456 test_db < /usr/test_db.sql
```

**_YML 配置文件：_**

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/84d67a4715554ef7bfb39bca411f19f4~tplv-k3u1fbpfcp-watermark.image)

最后，我们将脚本放在单元测试开始之前执行即可，在我们的项目中使用 Jest 来进行单元测试，所以将 createDB 函数放在 Jest 提供的 beforeAll 中执行，这样就实现了在测试之前自动化注入模板数据。

```js
beforeAll(async () => {
  await createDB();
  server = server.start(50000);
});
```

## 添加到 gitlab 的 CI 环节中

实现了测试自动化，那么接下来我们就可以将其添加到 CI 环节中。对 CI 以及 gitlab 的 CI 配置流程不太清楚的同学可以参考下[这篇文章](https://segmentfault.com/a/1190000037748013)。

这里我们不再讨论所有的 CI 配置环节，只给大家看一下 gitlab CI 主要的配置文件。

**_.gitlab-ci.yml 配置文件：_**

```yml
image: docker:stable

services:
  - docker:stable-dind

before_script:
  - apk add --no-cache --quiet py-pip
  - pip install --quiet docker-compose~=1.23.0
  - apk add nodejs npm

test:
  stage: test
  script:
    - npm install --unsafe-perm=true --registry=http://r.cnpmjs.org/
    - nohup docker-compose up & npm run test
```

因为我们的 gitlab CI 的 Runner 环境是一个 docker 容器，我们需要通过 **_image_** 来声明我们的 Runner 环境基于 docker 镜像进行初始化。

另外，我们的数据环境也是通过 docker 来构建的，所以就需要在 docker 容器中使用 docker 来启动我们的数据环境。这就需要在 **services** 下声明额外使用服务，这里使用了 docker:stable-dind，该镜像可以帮助我们在 docker 容器内创建额外的容器服务。

在 job 开始之前，我们需要在 **_before_script_** 下声明需要单独安装的 docker-compose 以及运行项目所需 nodejs、npm。

环境准备就绪，我们就进入了 test 这个 job。先安装依赖，然后通过 docker-compose 启动数据环境，之后运行 jest 进行单元测试（jest 会在运行单元测试之前将模板数据导入到数据库中）。

## 后记

到此，已经圆满完成了任务。回顾整个过程，道路是曲折的，但收获是快乐的。如果大家有什么好的想法建议或者疑问欢迎提出来。
