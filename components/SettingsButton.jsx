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
								width="18"
								height="18"
								viewBox="0 0 20 20"
							>
								<path
									fill="currentColor"
									d="M12.871,9.337H7.377c-0.304,0-0.549,0.246-0.549,0.549c0,0.303,0.246,0.55,0.549,0.55h5.494
								c0.305,0,0.551-0.247,0.551-0.55C13.422,9.583,13.176,9.337,12.871,9.337z M15.07,6.04H5.179c-0.304,0-0.549,0.246-0.549,0.55
								c0,0.303,0.246,0.549,0.549,0.549h9.891c0.303,0,0.549-0.247,0.549-0.549C15.619,6.286,15.373,6.04,15.07,6.04z M17.268,1.645
								H2.981c-0.911,0-1.648,0.738-1.648,1.648v10.988c0,0.912,0.738,1.648,1.648,1.648h4.938l2.205,2.205l2.206-2.205h4.938
								c0.91,0,1.648-0.736,1.648-1.648V3.293C18.916,2.382,18.178,1.645,17.268,1.645z M17.816,13.732c0,0.607-0.492,1.1-1.098,1.1
								h-4.939l-1.655,1.654l-1.656-1.654H3.531c-0.607,0-1.099-0.492-1.099-1.1v-9.89c0-0.607,0.492-1.099,1.099-1.099h13.188
								c0.605,0,1.098,0.492,1.098,1.099V13.732z"
								/>
							</svg>
						</div>
					</Button>
				)}
			</Tooltip>
		)
	}
}

module.exports = SettingsButton