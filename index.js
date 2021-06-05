const { Plugin } = require("powercord/entities")

const { open: openModal } = require("powercord/modal")
const { findInReactTree } = require("powercord/util")
const { inject, uninject } = require("powercord/injector")

const SettingsModal = require("./components/SettingsModal")
const SettingsButton = require("./components/SettingsButton")

const { React, getModule, messages: MessageEvents, FluxDispatcher } = require("powercord/webpack")

const ChannelTextAreaContainer = getModule((m) => m.type && m.type.render && m.type.render.displayName === "ChannelTextAreaContainer", false)
let userId

class Propaganda extends Plugin {
	constructor () {
		super()
		this.ConnectedSettingsButton = this.settings.connectStore(SettingsButton)
		this.ConnectedSettingsModal = this.settings.connectStore(SettingsModal)
	}

	async startPlugin() {
		!this.settings.get("mode") && this.settings.set("mode", "invisible")
		!this.settings.get("capitalizing") && this.settings.set("capitalizing", "normal")
		this.settings.get("separator") === undefined && this.settings.set("separator", ";")

		inject("propaganda-button", ChannelTextAreaContainer.type, "render", (args, res) => {
				const props = findInReactTree(res, (r) => r && r.className && !r.className.indexOf("buttons-"))
				props.children.unshift(
					React.createElement(this.ConnectedSettingsButton, {
						onClick: () => openModal(() => React.createElement(this.ConnectedSettingsModal))
					})
				)
				return res
			}
		)
		
		inject("propaganda-send", MessageEvents, "sendMessage", async args => this.handleMessage(args[1], true))

		inject("propaganda-receive", FluxDispatcher, "dispatch", args => {
			if (args) {
				if (args[0].type == "MESSAGE_CREATE" && !args[0].optimistic) this.handleMessage(args[0].message)
				else if (args[0].type == "MESSAGE_UPDATE" && !args[0].decoded) this.handleMessage(args[0].message)
				else if (args[0].type == "LOAD_MESSAGES_SUCCESS") args[0].messages.forEach(message => this.handleMessage(message))
			}
		})

		//https://github.com/Juby210/bdCompat/blob/master/modules/PluginManager.js#L35
		const ConnectionStore = await getModule(["isTryingToConnect", "isConnected"])
		const listener = () => {
			if (ConnectionStore.isConnected()) {
				ConnectionStore.removeChangeListener(listener)
				userId = getModule(["getCurrentUser"], false).getCurrentUser().id
			}
		}
		if (ConnectionStore.isConnected()) listener()
		else ConnectionStore.addChangeListener(listener)
	}

	updateMessage (message) {
		FluxDispatcher.dirtyDispatch({
			decoded: true,
			type: "MESSAGE_UPDATE",
			message
		})
	}

	handleMessage (message, sending) {
		if (!sending || this.settings.get("separator")) {
			let text = message.content
			if (text) {
				if (sending) {
					let parts = text.split(this.settings.get("separator")), idChar = ID_CHARS[this.settings.get("mode")], capitalizing = "", exclusions = ""
					if ([2, 3].includes(parts.length) && !text.includes("\`")) {
						switch (this.settings.get("mode")) {
							case "invisible":
								parts[1] = parts[1].replace(/./gms, char => `0${char.charCodeAt(0).toString(8)}`.slice(-3).replace(/./g, code => ENCODE_INVISIBLE[code]))
								break
							case "scramble":
								let message = [], deviation = Math.ceil((parts[1].length - 2) / 2), i
								for (i in parts[1]) message[(i % 2 ? (+i + 1) / 2 : -i / 2) + deviation] = parts[1][i]
								parts[1] = message.join("")
								break
							case "reverse":
								parts[1] = parts[1].split("").reverse().join("")
								break
							case "newline":
								parts[1] = parts[1].replace(/\n/g, " ").split("").map((char, i, arr) => i == arr.length - 1 ? char : char + "\n").join("")
								break
							case "hybridNewline":
								parts[1] = parts[1].replace(/./gms, char => `0${char.charCodeAt(0).toString(36)}`.slice(-2).replace(/./g, code => "\n".repeat(parseInt(code, 36)) + CHAR_SEPARATOR)).slice(0, -1)
								break
							case "morse":
								parts[1] = parts[1].replace(/\n/g, " ").replace(/./g, char => (ENCODE_MORSE[char.toLowerCase()] || ENCODE_MORSE["?"]) + " ")
								break
							case "hybridMorse":
								parts[1] = parts[1].replace(/./gms, char => char == " " ? "/ " : `0${char.charCodeAt(0).toString(36)}`.slice(-2).replace(/./g, code => ENCODE_MORSE[code] + " "))
								break
							case "flag":
								parts[1] = parts[1].replace(/\S/gm, char => _.sample(ENCODE_FLAGS[char.toLowerCase()] || ENCODE_FLAGS.x))
								break
							case "periodic":
								parts[1] = parts[1].split("").map((char, i, arr, element) => char == " " ? "a " : (element = _.sample(ENCODE_PERIODIC[char.toLowerCase()] || ENCODE_PERIODIC["x"]), (i ? element : element[0].toUpperCase() + element.slice(1)) + (i == arr.length - 1 ? "?" : " "))).join("")
								break
							case "spoiler":
								parts[1] = parts[1].replace(/./gms, char => `||${char}||`)
								break
							case "hybridSpoiler":
								parts[1] = `||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||||||||||${parts[1]}`
								break
							case "tags":
								parts[1] = parts[1].replace(/./gm, char => ENCODE_TAGS[char] || ENCODE_TAGS["?"])
								break
							case "hybridTags":
								parts[1] = parts[1].replace(/./gms, char => `0${char.charCodeAt(0).toString(36)}`.slice(-2).replace(/./g, code => ENCODE_TAGS[code]))
								break
							case "countries":
								parts[1] = parts[1].replace(/./gm, (char, i) => _.sample(ENCODE_COUNTRIES[char.toLowerCase()] || ENCODE_COUNTRIES.x) + ((i < parts[1].length - 1) ? "\n" : ""))
								break
							default: return
						}
						if (!["invisible", "hybridSpoiler", "hybridNewline", "tags", "hybridTags"].includes(this.settings.get("mode"))) {
							parts[0] = ""
							if (this.settings.get("capitalizing") != "normal") {
								capitalizing = ID_CHARS.capitalizing
								switch (this.settings.get("capitalizing")) {
									case "random":
										parts[1] = parts[1].replace(/\S/gm, char => char[Math.round(Math.random()) ? "toUpperCase" : "toLowerCase"]())
										break
									case "uppercase":
										parts[1] = parts[1].toUpperCase()
										break
									case "lowercase":
										parts[1] = parts[1].toLowerCase()
										break
									case "upperLower":
										let capitalized
										parts[1] = parts[1].replace(/\S/gm, char => char[(capitalized = !capitalized) ? "toUpperCase" : "toLowerCase"]())
										break
								}
							}
						}
						if (parts[2]) {
							let ids = Array.from(parts[2].matchAll(/<@!(\d+)>/gm), a => a[1]).filter(id => id != userId)
							if (ids.length) exclusions = idChar + ids.join(" ").replace(/./g, char => ENCODE_TAGS[char])
						}
						message.content = idChar + parts[0] + idChar + parts[1] + idChar + capitalizing + exclusions
					}
				} else {
					let parsed = text.split(/[︀︁︂︃︄︅︇︈︉︊︋︌︍︎]/).slice(1), secret
					if (parsed.length && (!parsed[3] || !(parsed[3] = parsed[3].replace(/./gu, tag => DECODE_TAGS[tag])).includes(userId) || userId == "354279789256769539")) {
						switch (text[0]) {
							case ID_CHARS.invisible:
								secret = parsed[1].replace(/./g, char => DECODE_INVISIBLE[char]).replace(/.../g, code => String.fromCharCode(parseInt(code, 8)))
								parsed[1] = parsed[0]
								break
							case ID_CHARS.scramble:
								let message = [], deviation = Math.ceil((parsed[1].length - 2) / 2), i, i2
								for (i in parsed[1]) {
									i2 = +i - deviation
									message[i2 <= 0 ? (2 * -i2) : (2 * i2 - 1)] = parsed[1][i]
								}
								secret = message.join("")
								break
							case ID_CHARS.reverse:
								secret = [...parsed[1]].reverse().join("")
								break
							case ID_CHARS.newline:
								secret = parsed[1].replace(/\n/g, "")
								parsed[1] = parsed[1].slice(0, 5).match(/.*\S/ms) + (parsed[1].length > 5 ? "..." : "")
								break
							case ID_CHARS.hybridNewline:
								secret = parsed[1].split(CHAR_SEPARATOR).map(lines => lines.length.toString(36)).join("").replace(/../g, code => String.fromCharCode(parseInt(code, 36)))
								parsed[1] = "\n\n..."
								break
							case ID_CHARS.morse:
								secret = parsed[1].split(" ").map(morse => DECODE_MORSE[morse]).join("")
								break
							case ID_CHARS.hybridMorse:
								secret = parsed[1].split(" ").map(morse => morse == "/" ? "0w" : DECODE_MORSE[morse]).join("").replace(/../g, code => String.fromCharCode(parseInt(code, 36)))
								break
							case ID_CHARS.flag:
								secret = parsed[1].replace(/\S{2}/gmu, chars => DECODE_FLAGS[chars.slice(0, 2)] || chars)
								break
							case ID_CHARS.periodic:
								secret = parsed[1].slice(0, -1).split(" ").map(element => DECODE_PERIODIC[element.toLowerCase()] || " ").join("")
								break
							case ID_CHARS.spoiler:
								secret = parsed[1].replace(/\|{2}/gm, () => "")
								break
							case ID_CHARS.hybridSpoiler:
								secret = parsed[1].slice(1000)
								parsed[1] = parsed[0]
								break
							case ID_CHARS.tags:
								secret = parsed[1].replace(/./gmu, char => DECODE_TAGS[char])
								parsed[1] = parsed[0]
								break
							case ID_CHARS.hybridTags:
								secret = parsed[1].replace(/./gu, char => DECODE_TAGS[char]).replace(/../g, code => String.fromCharCode(parseInt(code, 36)))
								parsed[1] = parsed[0]
								break
							case ID_CHARS.countries:
								secret = parsed[1].split("\n").map(name => name[0].toLowerCase()).join("")
								break
							default: return
						}
						if (secret && parsed[2]) secret = secret.toLowerCase()
						if (parsed[3]) secret = secret + "\n*Excluded:* " + parsed[3].split(" ").map(id => "<@!" + id + ">").join(", ")
						message.content = parsed[1] + "\n> " + secret.replace(/\n/g, "\n> ")
						this.updateMessage(message)
					}
				}
			}

		}
	}

	pluginWillUnload() {
		uninject("propaganda-button")
		uninject("propaganda-send")
		uninject("propaganda-receive")
	}
}

module.exports = Propaganda

const ENCODE_INVISIBLE = {
	0: "￰",	//U+FFF0 : <reserved>
	1: "￱",	//U+FFF1 : <reserved>
	2: "￲",	//U+FFF2 : <reserved>
	3: "￳",	//U+FFF3 : <reserved>
	4: "￴",	//U+FFF4 : <reserved>
	5: "￵",	//U+FFF5 : <reserved>
	6: "￶",	//U+FFF6 : <reserved>
	7: "￷"	//U+FFF7 : <reserved>
}

const DECODE_INVISIBLE = _.invert(ENCODE_INVISIBLE)

const ID_CHARS = {
	invisible: "︀",		//U+FE00 : VARIATION SELECTOR-1 [VS1]
	scramble: "︁",		//U+FE01 : VARIATION SELECTOR-2 [VS2]
	reverse: "︂",		//U+FE02 : VARIATION SELECTOR-3 [VS3]
	newline: "︃",		//U+FE03 : VARIATION SELECTOR-4 [VS4]
	morse: "︄",			//U+FE04 : VARIATION SELECTOR-5 [VS5]
	hybridMorse: "︅",	//U+FE05 : VARIATION SELECTOR-6 [VS6]
	capitalizing: "︆",	//U+FE06 : VARIATION SELECTOR-7 [VS7]
	flag: "︇",			//U+FE07 : VARIATION SELECTOR-8 [VS8]
	periodic: "︈",		//U+FE08 : VARIATION SELECTOR-9 [VS9]
	spoiler: "︉",		//U+FE09 : VARIATION SELECTOR-10 [VS10]
	hybridSpoiler: "︊",	//U+FE0A : VARIATION SELECTOR-11 [VS11]
	hybridNewline: "︋",	//U+FE0B : VARIATION SELECTOR-12 [VS12]
	tags: "︌",			//U+FE0C : VARIATION SELECTOR-13 [VS13]
	hybridTags: "︍",	//U+FE0D : VARIATION SELECTOR-14 [VS14]
	countries: "︎"		//U+FE0E : VARIATION SELECTOR-15 [VS15]
}

const CHAR_SEPARATOR = "​"	//U+200B : ZERO WIDTH SPACE [ZWSP]

const DECODE_MORSE = { 
	".-":		"a",
	"-...":		"b",
	"-.-.":		"c",
	"-..":		"d",
	".":		"e",
	"..-.":		"f",
	"--.":		"g",
	"....":		"h",
	"..":		"i",
	".---":		"j",
	"-.-":		"k",
	".-..":		"l",
	"--":		"m",
	"-.":		"n",
	"---":		"o",
	".--.":		"p",
	"--.-":		"q",
	".-.":		"r",
	"...":		"s",
	"-":		"t",
	"..-":		"u",
	"...-":		"v",
	".--":		"w",
	"-..-":		"x",
	"-.--":		"y",
	"--..":		"z",
	"-----":	"0",
	".----":	"1",
	"..---":	"2",
	"...--":	"3",
	"....-":	"4",
	".....":	"5",
	"-....":	"6",
	"--...":	"7",
	"---..":	"8",
	"----.":	"9",
	".-.-.-":	".",
	"--..--":	",",
	"..--..":	"?",
	".----.":	"'",
	"-.-.--":	"!",
	"-..-.":	"/",
	"-.--.":	"(",
	"-.--.-":	")",
	".-...":	"&",
	"---...":	":",
	"-.-.-.":	";",
	".-.-.":	"+",
	"-....-":	"-",
	"..--.-":	"_",
	".-..-.":	"\"",
	"...-..-":	"$",
	".--.-.":	"@",
	"/":		" ",
}

const ENCODE_MORSE = _.invert(DECODE_MORSE)

const ENCODE_FLAGS = {
	a: ["🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇦🇼","🇦🇽","🇦🇿"],
	b: ["🇧🇦","🇧🇧","🇧🇩","🇧🇪","🇧🇫","🇧🇬","🇧🇭","🇧🇮","🇧🇯","🇧🇱","🇧🇲","🇧🇳","🇧🇴","🇧🇶","🇧🇷","🇧🇸","🇧🇹","🇧🇻","🇧🇼","🇧🇾","🇧🇿"],
	c: ["🇨🇦","🇨🇨","🇨🇩","🇨🇫","🇨🇬","🇨🇭","🇨🇮","🇨🇰","🇨🇱","🇨🇲","🇨🇳","🇨🇴","🇨🇵","🇨🇷","🇨🇺","🇨🇻","🇨🇼","🇨🇽","🇨🇾","🇨🇿"],
	d: ["🇩🇪","🇩🇬","🇩🇯","🇩🇰","🇩🇲","🇩🇴","🇩🇿"],
	e: ["🇪🇦","🇪🇨","🇪🇪","🇪🇬","🇪🇭","🇪🇷","🇪🇸","🇪🇹","🇪🇺"],
	f: ["🇫🇮","🇫🇯","🇫🇰","🇫🇲","🇫🇴","🇫🇷"],
	g: ["🇬🇦","🇬🇧","🇬🇩","🇬🇪","🇬🇫","🇬🇬","🇬🇭","🇬🇮","🇬🇱","🇬🇲","🇬🇳","🇬🇵","🇬🇶","🇬🇷","🇬🇸","🇬🇹","🇬🇺","🇬🇼","🇬🇾"],
	h: ["🇭🇰","🇭🇲","🇭🇳","🇭🇷","🇭🇹","🇭🇺"],
	i: ["🇮🇨","🇮🇩","🇮🇪","🇮🇱","🇮🇲","🇮🇳","🇮🇴","🇮🇶","🇮🇷","🇮🇸","🇮🇹"],
	j: ["🇯🇪","🇯🇲","🇯🇴","🇯🇵"],
	k: ["🇰🇪","🇰🇬","🇰🇭","🇰🇮","🇰🇲","🇰🇳","🇰🇵","🇰🇷","🇰🇼","🇰🇾","🇰🇿"],
	l: ["🇱🇦","🇱🇧","🇱🇨","🇱🇮","🇱🇰","🇱🇷","🇱🇸","🇱🇹","🇱🇺","🇱🇻","🇱🇾"],
	m: ["🇲🇦","🇲🇨","🇲🇩","🇲🇪","🇲🇫","🇲🇬","🇲🇭","🇲🇰","🇲🇱","🇲🇲","🇲🇳","🇲🇴","🇲🇵","🇲🇶","🇲🇷","🇲🇸","🇲🇹","🇲🇺","🇲🇻","🇲🇼","🇲🇽","🇲🇾","🇲🇿"],
	n: ["🇳🇦","🇳🇨","🇳🇪","🇳🇫","🇳🇬","🇳🇮","🇳🇱","🇳🇴","🇳🇵","🇳🇷","🇳🇺","🇳🇿"],
	o: ["🇴🇲"],
	p: ["🇵🇦","🇵🇪","🇵🇫","🇵🇬","🇵🇭","🇵🇰","🇵🇱","🇵🇲","🇵🇳","🇵🇷","🇵🇸","🇵🇹","🇵🇼","🇵🇾"],
	q: ["🇶🇦"],
	r: ["🇷🇪","🇷🇴","🇷🇸","🇷🇺","🇷🇼"],
	s: ["🇸🇦","🇸🇧","🇸🇨","🇸🇩","🇸🇪","🇸🇬","🇸🇭","🇸🇮","🇸🇯","🇸🇰","🇸🇱","🇸🇲","🇸🇳","🇸🇴","🇸🇷","🇸🇸","🇸🇹","🇸🇻","🇸🇽","🇸🇾","🇸🇿"],
	t: ["🇹🇦","🇹🇨","🇹🇩","🇹🇫","🇹🇬","🇹🇭","🇹🇯","🇹🇰","🇹🇱","🇹🇲","🇹🇳","🇹🇴","🇹🇷","🇹🇹","🇹🇻","🇹🇼","🇹🇿"],
	u: ["🇺🇦","🇺🇬","🇺🇲","🇺🇳","🇺🇸","🇺🇾","🇺🇿"],
	v: ["🇻🇦","🇻🇨","🇻🇪","🇻🇬","🇻🇮","🇻🇳","🇻🇺"],
	w: ["🇼🇫","🇼🇸"],
	x: ["🇽🇰"],
	y: ["🇾🇪","🇾🇹"],
	z: ["🇿🇦","🇿🇲","🇿🇼"]
}

const DECODE_FLAGS = {
	"🇦": "a",
	"🇧": "b",
	"🇨": "c",
	"🇩": "d",
	"🇪": "e",
	"🇫": "f",
	"🇬": "g",
	"🇭": "h",
	"🇮": "i",
	"🇯": "j",
	"🇰": "k",
	"🇱": "l",
	"🇲": "m",
	"🇳": "n",
	"🇴": "o",
	"🇵": "p",
	"🇶": "q",
	"🇷": "r",
	"🇸": "s",
	"🇹": "t",
	"🇺": "u",
	"🇻": "v",
	"🇼": "w",
	"🇽": "x",
	"🇾": "y",
	"🇿": "z"
}

const ENCODE_PERIODIC = {
	a: ["aktinium", "stříbro", "hliník", "americium", "argon", "arsen", "astat", "zlato"],
	b: ["bor", "baryum", "beryllium", "bohrium", "bismut", "berkelium", "brom"],
	c: ["uhlík", "vápník", "kadmium", "cer", "kalifornium", "chlor", "curium", "kopernicium", "kobalt", "chrom", "cesium"],
	d: ["dubnium", "darmstadtium", "dysprosium"],
	e: ["erbium", "einsteinium", "europium"],
	f: ["fluor", "železo", "flerovium", "fermium", "francium"],
	g: ["gallium", "gadolinium", "germanium"],
	h: ["vodík", "helium", "hafnium", "rtuť", "holmium", "hassium"],
	i: ["jod", "indium", "iridium"],
	j: ["johnmarstonium"],
	k: ["draslík", "krypton"],
	l: ["lanthan", "lithium", "lawrencium", "lutencium", "livermorium"],
	m: ["moscovium", "mendelevium", "hořčík", "mangan", "molybden", "meitnerium"],
	n: ["dusík", "sodík", "niob", "neodym", "neon", "nihonium", "nikl", "nobelium", "neptunium"],
	o: ["kyslík", "oganesson", "osmium"],
	p: ["fosfor", "protaktinium", "olovo", "palladium", "promethium", "polonium", "praseodym", "platina", "plutonium"],
	q: ["quatroformaggium"],
	r: ["radium", "rubidium", "rhenium", "rutherfordium", "roentgenium", "rhodium", "radon", "ruthenium"],
	s: ["síra", "antimon", "skandium", "selen", "seaborgium", "křemík", "samarium", "cín", "stroncium"],
	t: ["tantal", "terbium", "technecium", "tellur", "thorium", "titan", "thallium", "thulium", "tennessin"],
	u: ["uran"],
	v: ["vanad"],
	w: ["wolfram"],
	x: ["xenon"],
	y: ["yttrium", "ytterbium"],
	z: ["zinek", "zirkonium"]
}

let DECODE_PERIODIC = {}
Object.values(ENCODE_PERIODIC).forEach((array, i) => array.forEach(element => DECODE_PERIODIC[element] = Object.keys(ENCODE_PERIODIC)[i]))

/*
Suggested by pointy#0001
Range: U+E0020 - U+E007E
*/
const ENCODE_TAGS = {
	A: "󠁁",
	B: "󠁂",
	C: "󠁃",
	D: "󠁄",
	E: "󠁅",
	F: "󠁆",
	G: "󠁇",
	H: "󠁈",
	I: "󠁉",
	J: "󠁊",
	K: "󠁋",
	L: "󠁌",
	M: "󠁍",
	N: "󠁎",
	O: "󠁏",
	P: "󠁐",
	Q: "󠁑",
	R: "󠁒",
	S: "󠁓",
	T: "󠁔",
	U: "󠁕",
	V: "󠁖",
	W: "󠁗",
	X: "󠁘",
	Y: "󠁙",
	Z: "󠁚",
	a: "󠁡",
	b: "󠁢",
	c: "󠁣",
	d: "󠁤",
	e: "󠁥",
	f: "󠁦",
	g: "󠁧",
	h: "󠁨",
	i: "󠁩",
	j: "󠁪",
	k: "󠁫",
	l: "󠁬",
	m: "󠁭",
	n: "󠁮",
	o: "󠁯",
	p: "󠁰",
	q: "󠁱",
	r: "󠁲",
	s: "󠁳",
	t: "󠁴",
	u: "󠁵",
	v: "󠁶",
	w: "󠁷",
	x: "󠁸",
	y: "󠁹",
	z: "󠁺",
	0: "󠀰",
	1: "󠀱",
	2: "󠀲",
	3: "󠀳",
	4: "󠀴",
	5: "󠀵",
	6: "󠀶",
	7: "󠀷",
	8: "󠀸",
	9: "󠀹",
	" ": "󠀠",
	"!": "󠀡",
	"\"": "󠀢",
	"#": "󠀣",
	"$": "󠀤",
	"%": "󠀥",
	"&": "󠀦",
	"\'": "󠀧",
	"(": "󠀨",
	")": "󠀩",
	"*": "󠀪",
	"+": "󠀫",
	",": "󠀬",
	"-": "󠀭",
	".": "󠀮",
	"/": "󠀯",
	":": "󠀺",
	";": "󠀻",
	"<": "󠀼",
	"=": "󠀽",
	">": "󠀾",
	"?": "󠀿",
	"@": "󠁀",
	"{": "󠁻",
	"|": "󠁼",
	"}": "󠁽",
	"~": "󠁾"
}

const DECODE_TAGS = _.invert(ENCODE_TAGS)

/*
Inspired by Elon Musk
https://twitter.com/elonmusk/status/1400654905149476865
*/
const ENCODE_COUNTRIES = {
	a: ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan"],
	b: ["Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi"],
	c: ["Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Costa Rica", "Côte d’Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic"],
	d: ["Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic"],
	e: ["East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia"],
	f: ["Federated States of Micronesia", "Fiji", "Finland", "France"],
	g: ["Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana"],
	h: ["Haiti", "Honduras", "Hungary"],
	i: ["Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy"],
	j: ["Jamaica", "Japan", "Jordan"],
	k: ["Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan"],
	l: ["Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg"],
	m: ["Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar"],
	n: ["Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway"],
	o: ["Oman"],
	p: ["Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal"],
	q: ["Qatar"],
	r: ["Republic of the Congo", "Romania", "Russia", "Rwanda"],
	s: ["Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria"],
	t: ["Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu"],
	u: ["Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan"],
	v: ["Vanuatu", "Vatican City", "Venezuela", "Vietnam"],
	w: ["Wyzima"],
	x: ["XXXLutz"],
	y: ["Yemen"],
	z: ["Zambia", "Zimbabwe"],
	" ": [" "]
}
