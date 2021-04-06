const { React } = require("powercord/webpack")
const { Modal } = require("powercord/components/modal")
const { FormTitle } = require("powercord/components")
const { SelectInput, TextInput, SwitchItem } = require("powercord/components/settings")

const ENCODING_MODES = [
	{
		label: "Invisible",
		value: "invisible"
	},
	{
		label: "Scramble",
		value: "scramble"
	},
	{
		label: "Snail Language",
		value: "snail"
	},
	{
		label: "UpPeR-LoWeR",
		value: "upperLower"
	},
	{
		label: "Morse Code",
		value: "morse"
	},
	{
		label: "Disabled",
		value: "disabled"
	}
]

class SettingsModal extends React.Component {
	render() {
		return (
			<Modal className="powercord-text" size={Modal.Sizes.LARGE}>
				<Modal.Header>
					<FormTitle tag="h4">Propaganda</FormTitle>
				</Modal.Header>
				<Modal.Content>
					<SelectInput
						children={["Encoding Mode"]}
						note="What encoding would you like to use?"
						searchable={false}
						options={ENCODING_MODES}
						value={this.props.getSetting("mode")}
						onChange={obj => this.props.updateSetting("mode", obj.value)}
					/>
					<TextInput
						children={["Separator"]}
						note="What character should separate visible and secret parts of message?"
						value={this.props.getSetting("separator")}
						onChange={string => this.props.updateSetting("separator", string)}
						maxLength={1}
					/>
				</Modal.Content>
			</Modal>
		)
	}
}

module.exports = SettingsModal
