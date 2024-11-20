import React, { useState } from 'react';
import axios from 'axios';
import ThreeMTTLogo from '../assets/three_mtt_logo.png'

const ChurnPredictor = () => {
    const [model, setModel] = useState('');
    const [metric, setMetric] = useState('');
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [listResults, setListResults] = useState(null);
    const [error, setError] = useState('');
    const [devToggle, setDevToggle] = useState(false);
    const [resultShow, setResultShow] = useState(false);
    const [features, setFeatures] = useState({
        'account length': '',
        'area code': '',
        'number vmail messages': '',
        'total day minutes': '',
        'total day calls': '',
        'total day charge': '',
        'total eve minutes': '',
        'total eve calls': '',
        'total eve charge': '',
        'total night minutes': '',
        'total night calls': '',
        'total intl minutes': '',
        'total intl calls': '',
        'customer service calls': '',
        'international plan_yes': '',
    });
    const [result, setResult] = useState(null);
    const [evalResult, setEvalResult] = useState(null);


    const handleToggle = () => {
        setDevToggle(!devToggle)

    }

    const handleListPrediction = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/churn/predict_list/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setListResults(response.data.predictions);
        } catch (error) {
            console.error('Error during bulk prediction:', error);
        }
    };


    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleChange = (e) => {
        setFeatures({
            ...features,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmitEvaluation = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8000/churn/evaluate/', { model, metric });
            setEvalResult(response.data);
        } catch (error) {
            console.error('Error during evaluation:', error);
        }
    };

    const handleSubmitPrediction = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8000/churn/predict/', features);
            setResult(response.data.prediction ? "True" : "False");
        } catch (error) {
            console.error('Error during prediction:', error);
        }
    };

    return (
        <div className=' bg-[#242424] min-h-screen py-10 px-7 flex flex-col items-center ' >
            <div className='flex justify-between w-full mb-16 '>
                <div className='flex items-center gap-1'>
                    <img className='h-7' src={ThreeMTTLogo} alt="" />
                    <div className='text-white flex items-center pl-1 font-bold  border-l-2 h-full '>
                        <h3  >DALCHEMY</h3>
                    </div>
                </div>
                <div className=' flex  gap-2  '>
                    <h4 className='text-white'>Dev Options</h4>
                    <button
                        onClick={handleToggle}

                        className={`bg-white px-1 py-[2px]  w-14 rounded-3xl flex justify-between  ${devToggle ? ' flex-row-reverse  border border-red-800' : ' border border-green-600'}   `} >
                        {devToggle ? 'off' : 'on'}

                        <div className={` h-6 w-6 rounded-full 
                        ${devToggle ? 'bg-red-800' : ' bg-green-500'}

                        `}>

                        </div>
                    </button>
                </div>
            </div>

            <h1 className='text-center text-white text-3xl uppercase text-wrap mb-10 ' >Customer Churn Prediction System</h1>

            <div className='bg-[#1d1b1b] p-5 shadow-md md:w-2/3 w-full '>
                {!devToggle &&
                    <div >
                        <h1 className='text-xl text-white mb-2'>SET MODEL</h1>
                        <form onSubmit={handleSubmitEvaluation}>
                            <select className='text-white bg-[#242424] rounded p-2 ' onChange={(e) => setModel(e.target.value)} required>
                                <option value="">Select Model</option>
                                <option value="Logistic Regression">Logistic Regression</option>
                                <option value="Random Forest">Random Forest</option>
                                <option value="XGBoost">XGBoost</option>
                            </select>
                            <select className='text-white bg-[#242424] rounded p-2  mx-4' onChange={(e) => setMetric(e.target.value)} required>
                                <option value="">Select Metric</option>
                                <option value="Accuracy">Accuracy</option>
                                <option value="Precision">Precision</option>
                                <option value="Recall">Recall</option>
                            </select>

                            <button className='bg-white rounded py-1 px-3 font-bold hover:bg-[#242424] hover:text-white hover:border ' type="submit" disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit'}
                            </button>

                        </form>

                        {evalResult && (
                            <div className='py-5 text-white'>
                                <h2>Result:</h2>
                                <pre>{JSON.stringify(evalResult, null, 2)}</pre>
                            </div>
                        )}
                    </div>}


                {devToggle &&
                    <div>
                        <h1 className='text-white font-bold uppercase mb-2 text-xl' >Predict Churn</h1>
                        <form onSubmit={handleSubmitPrediction}>
                            {Object.keys(features).map((feature, index) => (
                                <input className='rounded mr-2 my-2 text-white bg-[#242424]'
                                    key={index}
                                    type="text"
                                    name={feature}
                                    value={features[feature]}
                                    onChange={handleChange}
                                    placeholder={`Enter ${feature}`}
                                    required
                                />
                            ))}
                            <br />
                            <button 
                            // onClick={() => setResultShow(!resultShow)}
                                className=' mt-3 bg-white rounded py-1 px-3 font-bold hover:bg-[#242424] hover:text-white hover:border '
                                type="submit">Submit Prediction</button>
                        </form>

                        {result && (
                            <div 
                            className='text-white flex gap-2 my-3 items-center '
                            >
                                <h2 className='font-bold text-lg uppercase'>Result:</h2>
                                <pre className='bg-white text-black p-1 font-bold rounded'>{JSON.stringify(result, null, 1)}</pre>
                            </div>
                        )}




                        <h1 className='text-white font-bold uppercase my-10 mb-2 text-xl' >Predict Churn from CSV</h1>
                        <form onSubmit={handleListPrediction}>
                            <input className='text-[#dbcbcb]' type="file" accept=".csv" onChange={handleFileChange} required />
                            <br />
                            <button 
                            
                            className=' mt-3 bg-white rounded py-1 px-3 font-bold hover:bg-[#242424] hover:text-white hover:border '
                            type="submit">Submit Prediction</button>
                        </form>

                        {listResults && (
                            <div>
                                <h2>Bulk Prediction Results:</h2>
                                <ul>
                                    {listResults.map((result, index) => (
                                        <li className='font-bold text-white' key={index}>Customer {index + 1}: {result.prediction ? "Churn" : "No Churn"}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    </div>

                }
            </div>
<i className='text-white' >Training and testing data gotten from: <a href="https://www.kaggle.com/datasets/becksddf/churn-in-telecoms-dataset" target='blank' className='text-blue-500 hover:underline' >
    
     https://www.kaggle.com/datasets/becksddf/churn-in-telecoms-dataset
    </a>
     
     
     </i>

        </div>
    );
};

export default ChurnPredictor;
