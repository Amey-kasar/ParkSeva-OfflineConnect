from roboflow import Roboflow

rf = Roboflow(api_key="EyWb6jpXJZ4VeWCzzjg5")
project = rf.workspace("train-ubhk8").project("falling_datase-lxlr3")
dataset = project.version(1).download("yolov8")
