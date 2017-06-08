export type Direction = [number,number,number,number]

export type Distance2D = ( x: number, y: number ) => number

export type ShadowCastingParams<T> = {
	onStart?: ( state: T, x: number, y: number ) => T,
	onVisible?: ( state: T, x: number, y: number, distance: number ) => T,
	onEnd?: ( state: T, x: number, y: number ) => T,
}

export class ShadowCasting2D<T> {
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

	static doNothing<T>( state: T, ..._: any[] ) {
		return state	
	}

	static GET_DIRECTIONS_8: () => Direction[] = () => ShadowCasting2D.DIRECTIONS_8

	static MANHATTAN: Distance2D = ( dx, dy ) => Math.abs( dx ) + Math.abs( dy )
	static EUCLIDEAN: Distance2D = ( dx, dy ) => (dx*dx + dy*dy)**0.5
	static CHEBYSHEV: Distance2D = ( dx, dy ) => Math.max( Math.abs( dx ), Math.abs( dy ))

	constructor(
		public getBounds: ( state: T ) => [number,number,number,number],
		public isBlocked: ( state: T, x: number, y: number ) => boolean,
		public callbacks: ShadowCastingParams<T>,
		public getDistance: Distance2D = ShadowCasting2D.EUCLIDEAN,
		public getDirections: () => Direction[] = ShadowCasting2D.GET_DIRECTIONS_8
	) {}

	illuminate( state: T, x0: number, y0: number, radius: number ): T {
		const [minX, minY, maxX, maxY] = this.getBounds( state )
		const onStart: ( state: T, x: number, y: number ) => T = this.callbacks.onStart || ShadowCasting2D.doNothing
		const onVisible: ( state: T, x: number, y: number, distance: number ) => T = this.callbacks.onVisible || ShadowCasting2D.doNothing
		const onEnd: ( state: T, x: number, y: number ) => T = this.callbacks.onEnd || ShadowCasting2D.doNothing

		let newState = onStart.call( this, state, x0, y0 )

		newState = onVisible.call( this, state, x0, y0, 0 )

		for ( const [xx,xy,yx,yy] of this.getDirections() ) {
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
						for ( let dx = dy; dx < 0; dx++ ) {
							let x = x0 + dx * xx + xydy
							let y = y0 + yx * dx + yydy
							leftSlope  += invDyPlus05
							rightSlope += invDyMinus05

							if ( !(x >= minX && y >= minY && x <= maxX && y <= maxY) || start < rightSlope ) {
							
							} else if ( finish > leftSlope ) {
								break
							} else {
								const distance = this.getDistance( dx, dy )
								if ( distance <= radius ) {
									newState = onVisible.call( this, newState, x, y, distance )
								}
							}

							if ( blocked ) {
								if ( this.isBlocked( newState, x, y )) {
									newStart = rightSlope
								} else {
									blocked = false
									start = newStart
								}
							} else if ( this.isBlocked( newState, x, y ) && -dy < radius ) {
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
		for ( let i = 1; i <= radius; i++ ) {
			const x = x0 + i
			newState = onVisible.call( this, newState, x, y0, i )
			if ( x > maxX || this.isBlocked( newState, x, y0 )) break
		}
		for ( let i = 1; i <= radius; i++ ) {
			const x = x0 - i
			newState = onVisible.call( this, newState, x, y0, i )
			if ( x < minX || this.isBlocked( newState, x, y0 )) break
		}
		for ( let i = 1; i <= radius; i++ ) {
			const y = y0 + i
			newState = onVisible.call( this, newState, x0, y, i )
			if ( y > maxY || this.isBlocked( newState, x0, y )) break
		}
		for ( let i = 1; i <= radius; i++ ) {
			const y = y0 - i
			newState = onVisible.call( this, newState, x0, y, i )
			if ( y < minX || this.isBlocked( newState, x0, y )) break
		}
		newState = onEnd.call( this, newState )
		return newState
	}
}
