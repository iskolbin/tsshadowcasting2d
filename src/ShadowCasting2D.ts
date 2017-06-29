export interface ShadowCastingParams<T> {
	isBlocked: ( state: T, x: number, y: number ) => boolean,
	bounds?: [number,number,number,number],
	directions?: [number,number,number,number][]
	getDistance?: ( x: number, y: number ) => number,
	onStart?: ( state: T, x: number, y: number ) => T,
	onVisible?: ( state: T, x: number, y: number, distance: number ) => T,
	onEnd?: ( state: T, x: number, y: number ) => T,
	thisArg?: any,
}

export const DIRECTIONS_8: [number,number,number,number][] = [
	[ 0,-1,-1, 0],
	[-1, 0, 0,-1],
	[ 0, 1,-1, 0],
	[ 1, 0, 0,-1],
	[ 0,-1, 1, 0],
	[-1, 0, 0, 1],
	[ 0, 1, 1, 0],
	[ 1, 0, 0, 1],
]

export const MANHATTAN = ( dx: number, dy: number ) => Math.abs( dx ) + Math.abs( dy )

export const EUCLIDEAN = ( dx: number, dy: number ) => (dx*dx + dy*dy)**0.5

export const CHEBYSHEV = ( dx: number, dy: number ) => Math.max( Math.abs( dx ), Math.abs( dy ))

function doNothing<T>( state: T, ..._: any[] ): T {
	return state	
}

function alwaysTrue( ..._: any[] ): boolean {
	return true
}

const DEFAULT_BOUNDS: [number,number,number,number] = [-Infinity,-Infinity,Infinity,Infinity]

export function evaluate<T>( initialState: T, x0: number, y0: number, radius: number, params: ShadowCastingParams<T> ) {
	const thisArg = params.thisArg
	const [minX, minY, maxX, maxY] = params.bounds || DEFAULT_BOUNDS
	const isBlocked = params.isBlocked || alwaysTrue
	const getDistance = params.getDistance || EUCLIDEAN
	const onStart: ( state: T, x: number, y: number ) => T = params.onStart || doNothing
	const onVisible: ( state: T, x: number, y: number, distance: number ) => T = params.onVisible || doNothing
	const onEnd: ( state: T, x: number, y: number ) => T = params.onEnd || doNothing
	const directions = params.directions || DIRECTIONS_8

	let newState = onStart( initialState, x0, y0 )

	newState = onVisible.call( thisArg, newState, x0, y0, 0 )

	for ( const [xx,xy,yx,yy] of directions ) {
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
							const distance = getDistance.call( thisArg, dx, dy )
							if ( distance <= radius ) {
								newState = onVisible.call( thisArg, newState, x, y, distance )
							}
						}

						if ( blocked ) {
							if ( isBlocked.call( thisArg, newState, x, y )) {
								newStart = rightSlope
							} else {
								blocked = false
								start = newStart
							}
						} else if ( isBlocked.call( thisArg, newState, x, y ) && -dy < radius ) {
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
		newState = onVisible.call( thisArg, newState, x, y0, i )
		if ( x > maxX || isBlocked.call( thisArg, newState, x, y0 )) break
	}
	for ( let i = 1; i <= radius; i++ ) {
		const x = x0 - i
		newState = onVisible.call( thisArg, newState, x, y0, i )
		if ( x < minX || isBlocked.call( thisArg, newState, x, y0 )) break
	}
	for ( let i = 1; i <= radius; i++ ) {
		const y = y0 + i
		newState = onVisible.call( thisArg, newState, x0, y, i )
		if ( y > maxY || isBlocked.call( thisArg, newState, x0, y )) break
	}
	for ( let i = 1; i <= radius; i++ ) {
		const y = y0 - i
		newState = onVisible.call( thisArg, newState, x0, y, i )
		if ( y < minX || isBlocked.call( thisArg, newState, x0, y )) break
	}
	newState = onEnd.call( thisArg, newState )
	return newState
}

export class ShadowCasting2D<T> {	
	constructor(
		protected params: ShadowCastingParams<T> ) { 
	}

	evaluate( state: T, x0: number, y0: number, radius: number ): T {
		return evaluate( state, x0, y0, radius, this.params ) 
	}
}
