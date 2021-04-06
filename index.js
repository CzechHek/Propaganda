const { Plugin } = require("powercord/entities")

const { open: openModal } = require("powercord/modal")
const { findInReactTree } = require("powercord/util")
const { inject, uninject } = require("powercord/injector")

const SettingsModal = require("./components/SettingsModal")
const SettingsButton = require("./components/SettingsButton")

const { React, getModule, messages: MessageEvents, FluxDispatcher } = require("powercord/webpack")

const ChannelTextAreaContainer = getModule((m) => m.type && m.type.render && m.type.render.displayName === "ChannelTextAreaContainer", false)

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
	invisible: "︀",	//U+FE00 : VARIATION SELECTOR-1 [VS1]
	scramble: "︁",	//U+FE01 : VARIATION SELECTOR-2 [VS2]
	snail: "︂",		//U+FE02 : VARIATION SELECTOR-3 [VS3]
	upperLower: "︃"	//U+FE03 : VARIATION SELECTOR-4 [VS4]
}

const DECODE_CHARS = Object.fromEntries(Object.entries(ENCODE_CHARS).map(a => a.reverse()))

class Propaganda extends Plugin {
	constructor () {
		super()
		this.ConnectedSettingsButton = this.settings.connectStore(SettingsButton)
		this.ConnectedSettingsModal = this.settings.connectStore(SettingsModal)
	}

	startPlugin() {
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
		
		inject("propaganda-send", MessageEvents, "sendMessage", (args) => {
			this.handleMessage(args[1], true)
			return Promise.resolve()
		})

		inject("propaganda-receive", FluxDispatcher, "dispatch", args => {
			if (args[0].type == "MESSAGE_CREATE" && !args[0].optimistic) {
				this.handleMessage(args[0].message)
			} else if (args[0].type == "MESSAGE_UPDATE" && !args[0].decoded) {
				this.handleMessage(args[0].message)
			} else if (args[0].type == "LOAD_MESSAGES_SUCCESS") {
				args[0].messages.forEach(message => this.handleMessage(message))
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
		let text = message.content
		if (sending) {
			let parts = text.split(this.settings.get("separator"))
			if (parts.length == 2 && !text.includes("\`") && !text.includes(">")) {
				switch (this.settings.get("mode")) {
					case "invisible":
						parts[1] = parts[1].replace(/./g, char => `0${char.charCodeAt(0).toString(8)}`.slice(-3).replace(/./g, code => ENCODE_CHARS[code]))
						break
					case "scramble":
						let message = [], deviation = Math.ceil((parts[1].length - 2) / 2)
						for (let i in parts[1]) message[(i % 2 ? (+i + 1) / 2 : -i / 2) + deviation] = parts[1][i]
						parts[1] = message.join("")
						parts[0] = ""
						break
					case "snail":
						parts[1] = parts[1].split("").reverse().map(char => Math.round(Math.random()) ? char.toUpperCase() : char.toLowerCase()).join("")
						parts[0] = ""
						break
					case "upperLower":
						let upper
						parts[1] = parts[1].replace(/\S/g, char => (upper = !upper) ? char.toUpperCase() : char.toLowerCase())
						parts[0] == ""
						break
					default: return
				}
				let idChar = ID_CHARS[this.settings.get("mode")]
				message.content = idChar + parts[1] + idChar + parts[0]
			}
		} else {
			let parsed = (/[︀︁︂︃](.*)[︀︁︂︃](.*)/g).exec(text), secret
			switch (text[0]) {
				case ID_CHARS.invisible:
					secret = parsed[1].replace(/./g, char => DECODE_CHARS[char]).replace(/.../g, code => String.fromCharCode(parseInt(code, 8)))
					break
				case ID_CHARS.scramble:
					let message = [], deviation = Math.ceil((parsed[1].length - 2) / 2)
					for (let i in parsed[1]) {
						let i2 = +i - deviation
						message[i2 <= 0 ? (2 * -i2) : (2 * i2 - 1)] = parsed[1][i]
					}
					secret = message.join("")
					parsed[2] = parsed[1]
					break
				case ID_CHARS.snail:
					secret = parsed[1].toLowerCase().split("").reverse().join("")
					parsed[2] = parsed[1]
					break
				case ID_CHARS.upperLower:
					secret = parsed[1].toLowerCase()
					parsed[2] = parsed[1]
					break
				default: return
			}
			message.content = parsed[2] + "\n> " + secret
			this.updateMessage(message)
		}
	}

	pluginWillUnload() {
		uninject("propaganda-button")
		uninject("propaganda-send")
		uninject("propaganda-receive")
	}
}

module.exports = Propaganda