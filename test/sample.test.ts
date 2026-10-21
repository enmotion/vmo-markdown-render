import { describe, expect, it} from "vitest";

describe('sample test',()=>{
  it('simple value', ()=>{
    const a = 12
    expect(a).toBe(12)
  })
  it('aysnc methods', async ()=>{
    function sample(){
      return new Promise((resolve,reject)=>{
        setTimeout(()=>{
          resolve('mod')
        },1000)
      })
    }
    const a = await sample()
    expect(a).toBe('mod')
  })
})