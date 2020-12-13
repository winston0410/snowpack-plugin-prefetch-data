const glob = require('glob')
const flatCache = require('flat-cache')
const fs = require('fs-extra')
const path = require('path')
const {
  main: {
    success,
    warning,
    info
  }
} = require('log-symbols')
const chalk = require('chalk');

const isEmptyObj = (obj) => Object.keys(obj).length === 0

const fetchData = async (cache, filePath) => {
  const fetchFn = require(filePath)
  const data = await fetchFn()
  cache.setKey(filePath, data)
  cache.setKey(`${filePath}-timestamp`, new Date().getTime())
  cache.save()
  return {
    '.json': JSON.stringify(data)
  }
}

const fetchWarning = () => {
  console.log(
    info, chalk.blue(`Data of ${filePath} has been fetched from external source.`)
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
          return await fetchData(cache, filePath)
          fetchWarning()
        }

        const previousFetchTimestamp = cache.getKey(`${filePath}-timestamp`)
        const currentTimestamp = new Date().getTime()
        const timePassedSinceLastBuild = currentTimestamp - previousFetchTimestamp

        if (timePassedSinceLastBuild > cacheDuration) {
          return await fetchData(cache, filePath)
          fetchWarning()
        }

        const cachedData = cache.getKey(filePath)
        console.log(
          success, chalk.green(`Data of ${filePath} has been served from cache.`)
        )

        return {
          '.json': cachedData
        }
      }
    }
  }
}
