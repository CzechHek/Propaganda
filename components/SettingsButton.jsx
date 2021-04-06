const { React, getModule, getModuleByDisplayName } = require("powercord/webpack")
const { Button } = require("powercord/components")
const Tooltip = getModuleByDisplayName("Tooltip", false)

const buttonClasses = getModule(["button"], false)
const buttonWrapperClasses = getModule(["buttonWrapper", "pulseButton"], false)
const buttonTextAreaClasses = getModule(["button", "textArea"], false)

class SettingsButton extends React.Component {
	render() {
		return (
			<Tooltip
				color="black"
				postion="top"
				text="Propaganda"
			>
				{({ onMouseLeave, onMouseEnter }) => (
					<Button
						className={"propaganda-button"}
						look={Button.Looks.BLANK}
						size={Button.Sizes.ICON}
						onClick={() => this.props.onClick()}
						onContextMenu={() => this.props.onClick()}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
					>
						<div className={`${buttonClasses.contents} ${buttonWrapperClasses.button} ${buttonTextAreaClasses.button}`}>
							<svg
								className={`${buttonWrapperClasses.icon}`}
								width="15"
								height="15"
								viewBox="0 0 512 512"
							>
								<path fill="currentColor" d="M216.706,386.429l39.117,77.486l39.053-77.36C269.39,394.277,242.07,394.205,216.706,386.429z"/>
								<path fill="currentColor" d="M242.448,504.07l-71.976-142.576c-28.489-23.525-47.264-58.529-49.283-97.916L6.123,364.853   c-7.176,6.315-6.738,17.68,0.877,23.425l71.878,54.225l-43.485,43.74C25.981,495.711,32.645,512,46,512h206.715   C248.331,511.066,244.527,508.187,242.448,504.07z"/>
								<path fill="currentColor" d="M505.878,364.853L390.81,263.578c-2.033,39.661-21.058,74.875-49.882,98.403l-71.731,142.09   c-2.079,4.117-5.883,6.996-10.267,7.93H466c13.311,0,20.05-16.258,10.606-25.757l-43.485-43.74L505,388.278   C512.627,382.524,513.043,371.16,505.878,364.853z"/>
								<path fill="currentColor" d="M361,255.501c0,58.01-47.103,105.204-105,105.204c-57.897,0-105-47.195-105-105.204v-62.972h210V255.501z"/>
								<path fill="currentColor" d="M361,255.501c0,58.01-47.103,105.204-105,105.204c-57.897,0-105-47.195-105-105.204v-62.972h210V255.501z"/>
								<path fill="currentColor" d="M436,129.256h-49.229L350.337,10.614c-2.722-8.863-12.74-13.167-21.025-9.033l-73.582,36.727L182.728,1.602   c-8.292-4.169-18.34,0.137-21.064,9.013l-36.434,118.642H76c-10.224,0-17.466,10.204-14.23,20.08   c6.083,18.533,26.362,47.413,59.23,68.07V177.32c0-8.284,6.716-15,15-15h240c8.284,0,15,6.716,15,15v40.087   c32.602-20.49,53.097-49.383,59.23-68.07C453.463,139.471,446.236,129.256,436,129.256z"/>
							</svg>
						</div>
					</Button>
				)}
			</Tooltip>
		)
	}
}

module.exports = SettingsButton