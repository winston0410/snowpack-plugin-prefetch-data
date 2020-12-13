const flatCache = require('flat-cache')
const fs = require('fs-extra')
const path = require('path')
const {
  success,
  warning,
  info
} = require('log-symbols')
const chalk = require('chalk')

const isEmptyObj = (obj) => Object.keys(obj).length === 0

const fetchData = async (cache, filePath) => {
  const fetchFn = require(filePath)
  const data = await fetchFn()
  const stringifiedData = JSON.stringify(data)
  cache.setKey(filePath, stringifiedData)
  cache.setKey(`${filePath}-timestamp`, new Date().getTime())
  cache.save()
  return {
    '.json': stringifiedData
  }
}

const fetchWarning = (filePath) => {
  console.info(
    chalk.yellow('!', `Data of ${filePath} has been fetched from external source.`)
  )
}

module.exports = function (snowpackConfig, pluginOptions) {
  const { scriptSuffix, cacheDuration = 86400000, cachePath } = pluginOptions
  const cache = flatCache.load('prefetchData', cachePath)
  return {
    name: 'prefetch-data',
    resolve: {
      input: ['.js'],
      output: ['.json']
    },
    async load ({ fileExt, filePath }) {
      if (scriptSuffix.test(filePath)) {
        if (isEmptyObj(cache._persisted)) {
          fetchWarning(filePath)
          return await fetchData(cache, filePath)
        }

        const previousFetchTimestamp = cache.getKey(`${filePath}-timestamp`)
        const currentTimestamp = new Date().getTime()
        const timePassedSinceLastBuild = currentTimestamp - previousFetchTimestamp

        if (timePassedSinceLastBuild > cacheDuration) {
          fetchWarning(filePath)
          return await fetchData(cache, filePath)
        }

        const cachedData = cache.getKey(filePath)
        console.info(
          success, chalk.green(`Data of ${filePath} has been served from cache.`)
        )

        return {
          '.json': cachedData
        }
      }
    }
  }
}
