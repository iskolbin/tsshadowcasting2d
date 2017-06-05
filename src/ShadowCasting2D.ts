export type Direction = [number,number,number,number]

export type Distance2D = ( x: number, y: number ) => number

export class ShadowCasting2D {
	static DIRECTIONS_8: Direction[] = [
		[ 0,-1,-1, 0],
		[-1, 0, 0,-1],
		[ 0, 1,-1, 0],
		[ 1, 0, 0,-1],
		[ 0,-1, 1, 0],
		[-1, 0, 0, 1],
		[ 0, 1, 1, 0],
		[ 1, 0, 0, 1],
	]

	static MANHATTAN: Distance2D = ( dx, dy ) => Math.abs( dx ) + Math.abs( dy )
	static EUCLIDEAN: Distance2D = ( dx, dy ) => (dx*dx + dy*dy)**0.5
	static CHEBYSHEV: Distance2D = ( dx, dy ) => Math.max( Math.abs( dx ), Math.abs( dy ))

	constructor(
		public bounds: [number,number,number,number],
		public isBlocked: ( x: number, y: number ) => boolean,
		public callback: ( x: number, y: number, power: number ) => void,
		public distance: Distance2D = ShadowCasting2D.EUCLIDEAN,
		public directions: Direction[] = ShadowCasting2D.DIRECTIONS_8
	) {}

	illuminate( x0: number, y0: number, power: number ) {
		const radius = Math.abs( power )
		const negative = power < 0
		const decay = 1 / radius
		const [minX, minY, maxX, maxY] = this.bounds

		this.callback( 0, 0, power )

		for ( const [xx,xy,yx,yy] of this.directions ) {
			const stack: number[] = [1,1,0]
			let n = 3
			while ( n > 0 ) {
				const row = stack[n-3]
				let start = stack[n-2]
				const finish = stack[n-1]
				n -= 3
				if ( start >= finish ) {
					let newStart = 0
					let blocked = false
					for ( let dy = -row; dy >= -radius && !blocked; dy-- ) {
						const invDyPlus05  = 1 / (dy + 0.5)
						const invDyMinus05 = 1 / (dy - 0.5)
						let leftSlope  = (dy - 1.5) * invDyPlus05  
						let rightSlope = (dy - 0.5) * invDyMinus05
						const xydy = xy * dy
						const yydy = yy * dy
						for ( let dx = dy; dx >= 0; dx++ ) {
							let x = x0 + dx * xx + xydy
							let y = y0 + yx * dx + yydy
							leftSlope  += invDyPlus05
							rightSlope += invDyMinus05

							if ( !(x >= minX && y >= minY && x <= maxX && y <= maxY) || start < rightSlope ) {
							
							} else if ( finish > leftSlope ) {
								break
							} else {
								const distance = this.distance( dx, dy )
								if ( distance <= radius ) {
									let bright = 1.0 - decay * distance
									if ( dy === 0 || dx === 0 || dy === dx ) {
										bright *= 0.5
									}
									if ( negative ) {
										bright = -bright
									}
									this.callback( x, y, bright )
								}
							}

							if ( blocked ) {
								if ( this.isBlocked( x, y )) {
									newStart = rightSlope
								} else {
									blocked = false
									start = newStart
								}
							} else if ( this.isBlocked( x, y ) && -dy < radius ) {
								blocked = true
								n += 3
								stack[n-3] = -dy + 1
								stack[n-2] = start
								stack[n-1] = leftSlope
								newStart = rightSlope
							}
						}
					}
				}
			}
		}
	}
}
