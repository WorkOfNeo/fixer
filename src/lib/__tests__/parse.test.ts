import { parseStock } from '../parseStock'
import { detectQueryType } from '../ai/searchMapper'
import { detectSeasonCode } from '../ai/searchMapper'

describe('parseStock', () => {
  it('should parse stock data from HTML correctly', () => {
    const htmlFixture = `
      <div data-tab-name="statandstock">
        <div class="statAndStockBox">
          <table>
            <thead>
              <tr class="tableBackgroundBlack">
                <th>Color</th>
                <th>34</th>
                <th>36</th>
                <th>38</th>
                <th>40</th>
                <th>42</th>
                <th>44</th>
                <th>46</th>
                <th>48</th>
                <th>50</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>327 DARK DENIM</strong></td>
                <td>0</td>
                <td>5</td>
                <td>2</td>
                <td>8</td>
                <td>3</td>
                <td>1</td>
                <td>0</td>
                <td>4</td>
                <td>2</td>
              </tr>
              <tr>
                <td><strong>BLACK</strong></td>
                <td>1</td>
                <td>3</td>
                <td>7</td>
                <td>5</td>
                <td>2</td>
                <td>0</td>
                <td>1</td>
                <td>6</td>
                <td>3</td>
              </tr>
              <tr>
                <td><strong>Stock</strong></td>
                <td>1</td>
                <td>8</td>
                <td>9</td>
                <td>13</td>
                <td>5</td>
                <td>1</td>
                <td>1</td>
                <td>10</td>
                <td>5</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `

    const result = parseStock(htmlFixture, 'Stock')

    expect(result).toEqual({
      '327 DARK DENIM': {
        '34': 0,
        '36': 5,
        '38': 2,
        '40': 8,
        '42': 3,
        '44': 1,
        '46': 0,
        '48': 4,
        '50': 2,
        'Total': 25,
      },
      'BLACK': {
        '34': 1,
        '36': 3,
        '38': 7,
        '40': 5,
        '42': 2,
        '44': 0,
        '46': 1,
        '48': 6,
        '50': 3,
        'Total': 28,
      },
    })
  })

  it('should throw error when stock data is not found', () => {
    const htmlWithoutStockData = '<div>No stock data here</div>'

    expect(() => parseStock(htmlWithoutStockData, 'Stock')).toThrow('Stat and Stock tab content not found on page')
  })

  it('should throw error when no valid stock rows are found', () => {
    const htmlWithEmptyTable = `
      <div data-tab-name="statandstock">
        <div class="statAndStockBox">
          <table>
            <thead>
              <tr class="tableBackgroundBlack">
                <th>Color</th>
                <th>34</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Total</strong></td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `

    expect(() => parseStock(htmlWithEmptyTable, 'Stock')).toThrow('No stock data could be parsed for row type: "Stock"')
  })

  it('should handle empty cells and convert to zero', () => {
    const htmlWithEmptyCells = `
      <div data-tab-name="statandstock">
        <div class="statAndStockBox">
          <table>
            <thead>
              <tr class="tableBackgroundBlack">
                <th>Color</th>
                <th>34</th>
                <th>36</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>TEST COLOR</strong></td>
                <td></td>
                <td>5</td>
              </tr>
              <tr>
                <td><strong>Stock</strong></td>
                <td>0</td>
                <td>5</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `

    const result = parseStock(htmlWithEmptyCells, 'Stock')

    expect(result).toEqual({
      'TEST COLOR': {
        '34': 0,
        '36': 5,
        'Total': 5,
      },
    })
  })
})

describe('detectQueryType', () => {
  it('should detect style numbers correctly', () => {
    expect(detectQueryType('1010161')).toBe('no')
    expect(detectQueryType('ABC123')).toBe('no')
    expect(detectQueryType('ST1010161')).toBe('no')
    expect(detectQueryType('1010161ST')).toBe('no')
  })

  it('should detect style names correctly', () => {
    expect(detectQueryType('RANY')).toBe('name')
    expect(detectQueryType('Classic Denim')).toBe('name')
    expect(detectQueryType('Summer Dress')).toBe('name')
    expect(detectQueryType('Blue Jeans')).toBe('name')
  })

  it('should detect season codes correctly', () => {
    expect(detectQueryType('naomi.ea25')).toBe('name')
    expect(detectQueryType('style.es24')).toBe('name')
    expect(detectQueryType('product.hs25')).toBe('name')
    expect(detectQueryType('naomiesa25')).toBe('name')
    expect(detectQueryType('stylees24')).toBe('name')
    expect(detectQueryType('producths25')).toBe('name')
  })

  it('should handle edge cases', () => {
    // Short words like "RANY" should be style names in conversational context
    expect(detectQueryType('RANY')).toBe('name')
    expect(detectQueryType('ABC')).toBe('name') // Too short for style number
    expect(detectQueryType('123')).toBe('name') // Too short for style number
  })
})

describe('detectSeasonCode', () => {
  it('should detect season codes with dots', () => {
    const result1 = detectSeasonCode('naomi.ea25')
    expect(result1.hasSeason).toBe(true)
    expect(result1.seasonCode).toBe('ea25')
    expect(result1.baseStyle).toBe('naomi')

    const result2 = detectSeasonCode('style.es24')
    expect(result2.hasSeason).toBe(true)
    expect(result2.seasonCode).toBe('es24')
    expect(result2.baseStyle).toBe('style')
  })

  it('should detect season codes without dots', () => {
    const result1 = detectSeasonCode('naomiesa25')
    expect(result1.hasSeason).toBe(true)
    expect(result1.seasonCode).toBe('ea25')
    expect(result1.baseStyle).toBe('naomi')

    const result2 = detectSeasonCode('stylees24')
    expect(result2.hasSeason).toBe(true)
    expect(result2.seasonCode).toBe('es24')
    expect(result2.baseStyle).toBe('style')
  })

  it('should detect various season prefixes', () => {
    expect(detectSeasonCode('product.hs25').hasSeason).toBe(true)
    expect(detectSeasonCode('item.ss24').hasSeason).toBe(true)
    expect(detectSeasonCode('style.fw25').hasSeason).toBe(true)
    expect(detectSeasonCode('model.aw24').hasSeason).toBe(true)
    expect(detectSeasonCode('test.sp25').hasSeason).toBe(true)
    expect(detectSeasonCode('demo.su24').hasSeason).toBe(true)
    expect(detectSeasonCode('sample.fa25').hasSeason).toBe(true)
    expect(detectSeasonCode('example.wi24').hasSeason).toBe(true)
  })

  it('should not detect invalid season codes', () => {
    expect(detectSeasonCode('naomi.xy25').hasSeason).toBe(false)
    expect(detectSeasonCode('style.123').hasSeason).toBe(false)
    expect(detectSeasonCode('product.abc').hasSeason).toBe(false)
    expect(detectSeasonCode('naomi').hasSeason).toBe(false)
    expect(detectSeasonCode('style123').hasSeason).toBe(false)
  })

  it('should handle case insensitive detection', () => {
    expect(detectSeasonCode('NAOMI.EA25').hasSeason).toBe(true)
    expect(detectSeasonCode('Style.Es24').hasSeason).toBe(true)
    expect(detectSeasonCode('PRODUCT.HS25').hasSeason).toBe(true)
  })
}) 