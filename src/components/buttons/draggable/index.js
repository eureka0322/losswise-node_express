import React from 'react';
import styled from 'styled-components';
import getMousePosition from './getMousePosition';
import {withState} from 'recompose';
import ReactDOM from 'react-dom';


class Draggable extends React.Component{
  render(){
    const {touched, setTouched, onDrag, className} = this.props;
    return(
      <Container
        className={className}
        onMouseDown={() => {
          let onMouseUp = () => {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onMouseMove);
            setTouched(false)
          };

          let onMouseMove =  (e) =>  {
            let pos = $(ReactDOM.findDOMNode(this)).offset();
            const mousePos = getMousePosition(e)
            onDrag({
              x: e.pageX - pos.left,
              y: e.pageY - pos.top,
              ...mousePos,
            });
            e.stopPropagation();
            e.preventDefault()
          };

          document.addEventListener('mouseup', onMouseUp);
          document.addEventListener('mousemove', onMouseMove);
          setTouched(true)
        }}
      >
        <DotContainer>
          <Dot {...{touched}} />
          <Dot {...{touched}} />
          <Dot {...{touched}} />
        </DotContainer>

      </Container>
    )
  }
}




const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(100% - 100px);
  position: absolute;
  z-index: 111;
  border-top: 1px solid lightgrey;
  cursor: row-resize;
`;
const DotContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 25px;
  height: 10px;
  cursor: row-resize;
`;

const Dot = styled.div`
  width: 5px;
  height 5px;
  background: ${({touched}) => touched ? 'black' : 'grey'};
  border-radius: 2.5px;
`;

const enhancer = withState('touched', 'setTouched', false);

export default enhancer(Draggable);

