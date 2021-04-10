const { Plugin } = require("powercord/entities")

const { open: openModal } = require("powercord/modal")
const { findInReactTree } = require("powercord/util")
const { inject, uninject } = require("powercord/injector")

const SettingsModal = require("./components/SettingsModal")
const SettingsButton = require("./components/SettingsButton")

const { React, getModule, messages: MessageEvents, FluxDispatcher } = require("powercord/webpack")

const ChannelTextAreaContainer = getModule((m) => m.type && m.type.render && m.type.render.displayName === "ChannelTextAreaContainer", false)

class Propaganda extends Plugin {
	constructor () {
		super()
		this.ConnectedSettingsButton = this.settings.connectStore(SettingsButton)
		this.ConnectedSettingsModal = this.settings.connectStore(SettingsModal)
	}

	startPlugin() {
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
		
		inject("propaganda-send", MessageEvents, "sendMessage", (args) => new Promise (() => this.handleMessage(args[1], true)))

		inject("propaganda-receive", FluxDispatcher, "dispatch", args => {
			if (args) {
				if (args[0].type == "MESSAGE_CREATE" && !args[0].optimistic) this.handleMessage(args[0].message)
				else if (args[0].type == "MESSAGE_UPDATE" && !args[0].decoded) this.handleMessage(args[0].message)
				else if (args[0].type == "LOAD_MESSAGES_SUCCESS") args[0].messages.forEach(message => this.handleMessage(message))
			}
		})
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
			if (sending) {
				let parts = text.split(this.settings.get("separator"))
				if (parts.length == 2 && !text.includes("\`")) {
					switch (this.settings.get("mode")) {
						case "invisible":
							parts[1] = parts[1].replace(/./gms, char => `0${char.charCodeAt(0).toString(8)}`.slice(-3).replace(/./g, code => ENCODE_CHARS[code]))
							break
						case "scramble":
							let message = [], deviation = Math.ceil((parts[1].length - 2) / 2), i
							for (i in parts[1]) message[(i % 2 ? (+i + 1) / 2 : -i / 2) + deviation] = parts[1][i]
							parts[1] = message.join("")
							parts[0] = ""
							break
						case "reverse":
							parts[1] = parts[1].split("").reverse().join("")
							parts[0] = ""
							break
						case "newline":
							parts[1] = parts[1].replace(/\n/g, " ").split("").map((char, i, arr) => i == arr.length - 1 ? char : char + "\n").join("")
							parts[0] = ""
							break
						case "morse":
							parts[1] = parts[1].replace(/\n/g, " ").replace(/./g, char => (ENCODE_MORSE[char.toLowerCase()] || ENCODE_MORSE["?"]) + " ")
							parts[0] = ""
							break
						case "hybridMorse":
							parts[1] = parts[1].replace(/./gms, char => char == " " ? "/ " : `0${char.charCodeAt(0).toString(36)}`.slice(-2).replace(/./g, code => ENCODE_MORSE[code] + " "))
							break
						default: return
					}
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
					let idChar = ID_CHARS[this.settings.get("mode")]
					message.content = idChar + parts[1] + idChar + parts[0] + (this.settings.get("capitalizing") != "normal" ? ID_CHARS.capitalizing : "")
				}
			} else {
				let parsed = (/[︀︁︂︃︄︅](.*)[︀︁︂︃︄︅](.*)/gms).exec(text), secret = ""
				if (parsed) {
					switch (text[0]) {
						case ID_CHARS.invisible:
							secret = parsed[1].replace(/./g, char => DECODE_CHARS[char]).replace(/.../g, code => String.fromCharCode(parseInt(code, 8)))
							parsed[1] = parsed[2]
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
							secret = parsed[1].split("").reverse().join("")
							break
						case ID_CHARS.newline:
							secret = parsed[1].replace(/\n/g, "")
							parsed[1] = parsed[1].slice(0, 5).match(/.*\S/ms) + (parsed[1].length > 5 ? "..." : "")
							break
						case ID_CHARS.morse:
							secret = parsed[1].split(" ").map(morse => DECODE_MORSE[morse]).join("")
							break
						case ID_CHARS.hybridMorse:
							secret = parsed[1].split(" ").map(morse => morse == "/" ? "0w" : DECODE_MORSE[morse]).join("").replace(/../g, code => String.fromCharCode(parseInt(code, 36)))
							break
						default: return
					}
					if (secret && text.endsWith(ID_CHARS.capitalizing)) secret = secret.toLowerCase()
					message.content = parsed[1] + "\n> " + secret.replace(/\n/g, "\n> ")
					this.updateMessage(message)
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

const ENCODE_CHARS = {
	0: "￰",	//U+FFF0 : <reserved>
	1: "￱",	//U+FFF1 : <reserved>
	2: "￲",	//U+FFF2 : <reserved>
	3: "￳",	//U+FFF3 : <reserved>
	4: "￴",	//U+FFF4 : <reserved>
	5: "￵",	//U+FFF5 : <reserved>
	6: "￶",	//U+FFF6 : <reserved>
	7: "￷"	//U+FFF7 : <reserved>
}

const ID_CHARS = {
	invisible: "︀",		//U+FE00 : VARIATION SELECTOR-1 [VS1]
	scramble: "︁",		//U+FE01 : VARIATION SELECTOR-2 [VS2]
	reverse: "︂",		//U+FE02 : VARIATION SELECTOR-3 [VS3]
	newline: "︃",		//U+FE03 : VARIATION SELECTOR-4 [VS4]
	morse: "︄",			//U+FE04 : VARIATION SELECTOR-5 [VS5]
	hybridMorse: "︅",	//U+FE05 : VARIATION SELECTOR-6 [VS6]
	capitalizing: "︆",	//U+FE06 : VARIATION SELECTOR-7 [VS7]
}

const DECODE_CHARS = _.invert(ENCODE_CHARS)

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

ENCODE_MORSE = _.invert(DECODE_MORSE)