
class ListData  {

  constructor(docs) {

    let out = [];
    docs.forEach( (d) => {
      out.push({
        name: d.name.length === 0 ? d.category + ' ' + d.pathType : d.name,
        stats: d.stats,
        startTime: d.startTime,
        pathId: d._id
      })
    })

   return out

  }


}

module.exports = {
  ListData
}
